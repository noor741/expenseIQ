import { corsHeaders, createErrorResponse, createResponse } from '../_shared/cors.ts';
import { createSupabaseClient, getUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const apiKey = req.headers.get('apikey');
    
    // For GET requests, allow access with just the anon key
    const isGetRequest = req.method === 'GET';
    
    if (!authHeader && !isGetRequest) {
      return createErrorResponse('Authorization header required', 401);
    }

    let user = null;
    let supabase;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      try {
        user = await getUser(token);
        supabase = createSupabaseClient(token);
      } catch (error) {
        if (!isGetRequest) {
          return createErrorResponse('Invalid authentication token', 401);
        }
        // For GET requests, fall back to anon access
        supabase = createSupabaseClient();
      }
    } else {
      // Use anon client for GET requests
      supabase = createSupabaseClient();
    }

    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const categoryId = pathSegments[pathSegments.length - 1];

    switch (req.method) {
      case 'GET':
        if (categoryId && categoryId !== 'categories') {
          // Get single category
          const { data, error } = await supabase
            .from('categories')
            .select('*')
            .eq('id', categoryId)
            .single();

          if (error) {
            return createErrorResponse(`Category not found: ${error.message}`, 404);
          }

          return createResponse({ success: true, data });
        } else {
          // Get all categories
          const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('name', { ascending: true });

          if (error) {
            return createErrorResponse(`Failed to fetch categories: ${error.message}`);
          }

          return createResponse({ success: true, data });
        }

      case 'POST':
        // Create new category - requires authentication
        if (!user) {
          return createErrorResponse('Authentication required for creating categories', 401);
        }
        
        const { name, description } = await req.json();

        if (!name) {
          return createErrorResponse('Category name is required');
        }

        const { data, error } = await supabase
          .from('categories')
          .insert({ name, description })
          .select()
          .single();

        if (error) {
          return createErrorResponse(`Failed to create category: ${error.message}`);
        }

        return createResponse({ success: true, data }, 201);

      case 'PUT':
        // Update category - requires authentication
        if (!user) {
          return createErrorResponse('Authentication required for updating categories', 401);
        }
        
        if (!categoryId || categoryId === 'categories') {
          return createErrorResponse('Category ID required for update');
        }

        const updateData = await req.json();
        const allowedFields = ['name', 'description'];
        const filteredData = Object.keys(updateData)
          .filter(key => allowedFields.includes(key))
          .reduce((obj, key) => {
            obj[key] = updateData[key];
            return obj;
          }, {} as any);

        const { data: updatedData, error: updateError } = await supabase
          .from('categories')
          .update(filteredData)
          .eq('id', categoryId)
          .select()
          .single();

        if (updateError) {
          return createErrorResponse(`Failed to update category: ${updateError.message}`);
        }

        return createResponse({ success: true, data: updatedData });

      case 'DELETE':
        // Delete category - requires authentication
        if (!user) {
          return createErrorResponse('Authentication required for deleting categories', 401);
        }
        
        if (!categoryId || categoryId === 'categories') {
          return createErrorResponse('Category ID required for deletion');
        }

        const { error: deleteError } = await supabase
          .from('categories')
          .delete()
          .eq('id', categoryId);

        if (deleteError) {
          return createErrorResponse(`Failed to delete category: ${deleteError.message}`);
        }

        return createResponse({ success: true, message: 'Category deleted successfully' });

      default:
        return createErrorResponse('Method not allowed', 405);
    }
  } catch (error) {
    console.error('Categories API error:', error);
    return createErrorResponse('Internal server error', 500);
  }
});
