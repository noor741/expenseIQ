import { corsHeaders, createErrorResponse, createResponse } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🧪 Starting Azure services test...');

    // Test environment variables
    const azureEndpoint = Deno.env.get('AZURE_FORM_RECOGNIZER_ENDPOINT');
    const azureKey = Deno.env.get('AZURE_FORM_RECOGNIZER_KEY');
    const textAnalyticsEndpoint = Deno.env.get('AZURE_TEXT_ANALYTICS_ENDPOINT');
    const textAnalyticsKey = Deno.env.get('AZURE_TEXT_ANALYTICS_KEY');

    console.log('📋 Environment Variables Check:');
    console.log('- Azure Form Recognizer Endpoint:', azureEndpoint ? '✅ Set' : '❌ Missing');
    console.log('- Azure Form Recognizer Key:', azureKey ? '✅ Set' : '❌ Missing');
    console.log('- Azure Text Analytics Endpoint:', textAnalyticsEndpoint ? '✅ Set' : '❌ Missing');
    console.log('- Azure Text Analytics Key:', textAnalyticsKey ? '✅ Set' : '❌ Missing');

    const testResults = {
      environmentVariables: {
        azureFormRecognizerEndpoint: !!azureEndpoint,
        azureFormRecognizerKey: !!azureKey,
        azureTextAnalyticsEndpoint: !!textAnalyticsEndpoint,
        azureTextAnalyticsKey: !!textAnalyticsKey
      },
      azureOCRTest: null as any,
      azureCategoryTest: null as any
    };

    // Test Azure Form Recognizer availability
    if (azureEndpoint && azureKey) {
      try {
        console.log('🔍 Testing Azure Form Recognizer connectivity...');
        
        // Simple test to check if the endpoint is reachable
        const testResponse = await fetch(`${azureEndpoint}/formrecognizer/documentModels/prebuilt-receipt?api-version=2022-08-31`, {
          method: 'GET',
          headers: {
            'Ocp-Apim-Subscription-Key': azureKey,
          }
        });

        testResults.azureOCRTest = {
          success: testResponse.ok,
          status: testResponse.status,
          statusText: testResponse.statusText,
          message: testResponse.ok ? 'Azure Form Recognizer accessible' : 'Azure Form Recognizer not accessible'
        };

        console.log(`🔷 Azure Form Recognizer test: ${testResponse.status} ${testResponse.statusText}`);

      } catch (error) {
        testResults.azureOCRTest = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          message: 'Azure Form Recognizer connection failed'
        };
        console.error('❌ Azure Form Recognizer test failed:', error);
      }
    } else {
      testResults.azureOCRTest = {
        success: false,
        message: 'Azure Form Recognizer credentials missing'
      };
    }

    // Test Azure Text Analytics availability
    if (textAnalyticsEndpoint && textAnalyticsKey && textAnalyticsKey !== 'placeholder_key_for_testing') {
      try {
        console.log('🔍 Testing Azure Text Analytics connectivity...');
        
        // Simple test with minimal text
        const testTextResponse = await fetch(`${textAnalyticsEndpoint}/text/analytics/v3.1/keyPhrases`, {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': textAnalyticsKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            documents: [
              {
                id: '1',
                language: 'en',
                text: 'Test restaurant food'
              }
            ]
          })
        });

        let responseData = null;
        try {
          responseData = await testTextResponse.json();
        } catch (jsonError) {
          console.log('Could not parse JSON response');
        }

        testResults.azureCategoryTest = {
          success: testTextResponse.ok,
          status: testTextResponse.status,
          statusText: testTextResponse.statusText,
          message: testTextResponse.ok ? 'Azure Text Analytics accessible' : 'Azure Text Analytics not accessible',
          responseData: responseData
        };

        console.log(`🔷 Azure Text Analytics test: ${testTextResponse.status} ${testTextResponse.statusText}`);

      } catch (error) {
        testResults.azureCategoryTest = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          message: 'Azure Text Analytics connection failed'
        };
        console.error('❌ Azure Text Analytics test failed:', error);
      }
    } else {
      testResults.azureCategoryTest = {
        success: false,
        message: textAnalyticsKey === 'placeholder_key_for_testing' 
          ? 'Azure Text Analytics using placeholder key' 
          : 'Azure Text Analytics credentials missing'
      };
    }

    console.log('✅ Azure services test completed');

    return createResponse({
      success: true,
      data: testResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 Azure test error:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Test failed', 
      500
    );
  }
});
