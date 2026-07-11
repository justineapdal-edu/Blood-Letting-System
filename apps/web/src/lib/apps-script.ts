export function buildAppsScript(portalUrl: string, token: string): string {
  return `/**
 * Blood Donor Admin Portal - Webhook Script
 *
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Form -> Extensions -> Apps Script
 * 2. Delete any existing code and paste this entire script
 * 3. Update PORTAL_URL and CONNECTION_TOKEN if they change
 * 4. Run the setupTrigger() function once (Run -> setupTrigger)
 *    - This will ask for permissions and create the trigger automatically
 * 5. Test with testWebhook() (Run -> testWebhook) to verify connectivity
 *
 * TROUBLESHOOTING:
 * - If you see "Cannot read properties of undefined (reading 'response')",
 *   the trigger is not set up. Run setupTrigger() again.
 * - Check View -> Logs for webhook response details.
 */

const PORTAL_URL = '${portalUrl}/api/webhook'
const CONNECTION_TOKEN = '${token}'

// Called automatically when a form is submitted
function onSubmit(e) {
  if (!e || !e.response) {
    Logger.log('onSubmit called without event object. Run setupTrigger() to create the trigger.')
    return
  }

  try {
    var formResponse = e.response
    var itemResponses = formResponse.getItemResponses()

    var payload = {
      token: CONNECTION_TOKEN,
      submittedAt: formResponse.getTimestamp().toISOString(),
      responses: {},
    }

    itemResponses.forEach(function(itemResponse) {
      var question = itemResponse.getItem().getTitle()
      var answer = itemResponse.getResponse()
      payload.responses[question] = answer
    })

    var options = {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
      headers: {
        'ngrok-skip-browser-warning': 'true',
      },
    }

    var response = UrlFetchApp.fetch(PORTAL_URL, options)
    Logger.log('Webhook sent successfully. Status: ' + response.getResponseCode())
    Logger.log('Response: ' + response.getContentText())
  } catch (error) {
    Logger.log('Webhook failed: ' + error.toString())
  }
}

// Run this function ONCE to set up the trigger automatically
function setupTrigger() {
  var form = FormApp.getActiveForm()

  // Remove any existing onSubmit triggers to avoid duplicates
  var triggers = ScriptApp.getProjectTriggers()
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'onSubmit') {
      ScriptApp.deleteTrigger(trigger)
      Logger.log('Removed existing onSubmit trigger.')
    }
  })

  // Create new trigger
  ScriptApp.newTrigger('onSubmit')
    .forForm(form)
    .onFormSubmit()
    .create()

  Logger.log('Trigger created successfully! The script will now run on every form submission.')
  Logger.log('You can test connectivity with testWebhook().')
}

// Run this function to test the webhook connection
function testWebhook() {
  var payload = {
    token: CONNECTION_TOKEN,
    submittedAt: new Date().toISOString(),
    responses: {
      'Test Question': 'Test Answer - ' + new Date().toISOString(),
    },
  }

  var options = {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
    headers: {
      'ngrok-skip-browser-warning': 'true',
    },
  }

  try {
    var response = UrlFetchApp.fetch(PORTAL_URL, options)
    Logger.log('Test webhook sent!')
    Logger.log('Status: ' + response.getResponseCode())
    Logger.log('Response: ' + response.getContentText())
  } catch (error) {
    Logger.log('Test webhook failed: ' + error.toString())
  }
}`
}
