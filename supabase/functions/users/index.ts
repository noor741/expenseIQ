import { corsHeaders, createErrorResponse, createResponse } from '../_shared/cors.ts';
import { createSupabaseClient, getUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createErrorResponse('Authorization header required', 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const user = await getUser(token);
    const supabase = createSupabaseClient(token);

    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const endpoint = pathSegments[pathSegments.length - 1];

    switch (req.method) {
      case 'GET':
        if (endpoint === 'profile') {
          // Get current user profile
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

          if (error) {
            return createErrorResponse(`User profile not found: ${error.message}`, 404);
          }

          return createResponse({ success: true, data });
        } else {
          // Get user stats/dashboard data
          const [receiptsResult, expensesResult] = await Promise.all([
            supabase
              .from('receipts')
              .select('id, status', { count: 'exact' })
              .eq('user_id', user.id),
            supabase
              .from('expenses')
              .select('total, transaction_date')
              .eq('receipts.user_id', user.id)
              .order('transaction_date', { ascending: false })
              .limit(10)
          ]);

          const stats = {
            totalReceipts: receiptsResult.count || 0,
            receiptsByStatus: receiptsResult.data?.reduce((acc: Record<string, number>, receipt: any) => {
              acc[receipt.status] = (acc[receipt.status] || 0) + 1;
              return acc;
            }, {} as Record<string, number>) || {},
            recentExpenses: expensesResult.data || [],
            totalExpenses: expensesResult.data?.reduce((sum: number, exp: any) => sum + exp.total, 0) || 0
          };

          return createResponse({ success: true, data: stats });
        }

      case 'POST':
        // Create/ensure user record exists
        const { full_name, preferred_name, email } = await req.json();

        const { data, error } = await supabase
          .from('users')
          .upsert({
            id: user.id,
            full_name,
            preferred_name,
            email: email || user.email,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' })
          .select()
          .single();

        if (error) {
          return createErrorResponse(`Failed to create/update user: ${error.message}`);
        }

        return createResponse({ success: true, data }, 201);

      case 'PUT':
        // Update user profile
        const updateData = await req.json();
        const allowedFields = ['full_name', 'preferred_name', 'email', 'phone_number'];
        const filteredData = Object.keys(updateData)
          .filter(key => allowedFields.includes(key))
          .reduce((obj, key) => {
            obj[key] = updateData[key];
            return obj;
          }, {} as any);

        filteredData.updated_at = new Date().toISOString();

        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update(filteredData)
          .eq('id', user.id)
          .select()
          .single();

        if (updateError) {
          return createErrorResponse(`Failed to update user: ${updateError.message}`);
        }

        return createResponse({ success: true, data: updatedUser });

      case 'DELETE':
        // HARD DELETE - Permanently delete user and all associated data
        try {
          // First, get all receipts to delete their storage files
          const { data: receipts } = await supabase
            .from('receipts')
            .select('file_url')
            .eq('user_id', user.id);

          // Delete receipt files from storage
          if (receipts && receipts.length > 0) {
            const filePaths = receipts
              .map(receipt => receipt.file_url)
              .filter(url => url) // Filter out null/undefined URLs
              .map(url => {
                // Extract file path from URL
                const urlParts = url.split('/');
                return urlParts[urlParts.length - 1];
              });

            if (filePaths.length > 0) {
              const { error: storageError } = await supabase.storage
                .from('receipts')
                .remove(filePaths);

              if (storageError) {
                console.error('Error deleting receipt files:', storageError);
                // Continue with deletion even if storage cleanup fails
              }
            }
          }

          // Delete in order to respect foreign key constraints
          // 1. Delete expenses (references receipts)
          const { error: expensesError } = await supabase
            .from('expenses')
            .delete()
            .in('receipt_id', 
              supabase
                .from('receipts')
                .select('id')
                .eq('user_id', user.id)
            );

          if (expensesError) {
            console.error('Error deleting expenses:', expensesError);
          }

          // 2. Delete receipts (references users)
          const { error: receiptsError } = await supabase
            .from('receipts')
            .delete()
            .eq('user_id', user.id);

          if (receiptsError) {
            console.error('Error deleting receipts:', receiptsError);
          }

          // 3. Delete categories (references users)
          const { error: categoriesError } = await supabase
            .from('categories')
            .delete()
            .eq('user_id', user.id);

          if (categoriesError) {
            console.error('Error deleting categories:', categoriesError);
          }

          // 4. Delete user record
          const { error: userError } = await supabase
            .from('users')
            .delete()
            .eq('id', user.id);

          if (userError) {
            return createErrorResponse(`Failed to delete user profile: ${userError.message}`);
          }

          // 5. Delete from auth.users (this removes the actual authentication)
          const { error: authError } = await supabase.auth.admin.deleteUser(user.id);

          if (authError) {
            console.error('Error deleting auth user:', authError);
            // Continue anyway as the profile data is already deleted
          }

          return createResponse({ 
            success: true, 
            message: 'User account and all associated data permanently deleted' 
          });

        } catch (error) {
          console.error('Error during account deletion:', error);
          return createErrorResponse('Failed to complete account deletion. Some data may remain.');
        }

      default:
        return createErrorResponse('Method not allowed', 405);
    }
  } catch (error) {
    console.error('Users API error:', error);
    return createErrorResponse('Internal server error', 500);
  }
});
