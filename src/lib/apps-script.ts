export function buildAppsScript(portalUrl: string, token: string): string {
  return `/**
 * Blood Donor Admin Portal - Webhook Script
 *
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Form -> Extensions -> Apps Script
 * 2. Delete any existing code and paste this entire script
 * 3. Run setupTrigger() first (Run -> setupTrigger)
 *    - This will ask for permissions, authorize the script, and create the trigger
 *    - You MUST complete the authorization prompt on the first run
 * 4. Test with testWebhook() (Run -> testWebhook) to verify connectivity
 *
 * IMPORTANT: You MUST run setupTrigger() before anything else.
 * If you see "Unexpected error" on .create(), it means the script
 * was not authorized. Run setupTrigger() and complete the OAuth prompt.
 */

const PORTAL_URL = '${portalUrl}/api/webhook'
const CONNECTION_TOKEN = '${token}'

function onSubmit(e) {
  if (!e || !e.response) {
    Logger.log('onSubmit called without event object. Run setupTrigger() first.')
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

    for (var i = 0; i < itemResponses.length; i++) {
      var itemResponse = itemResponses[i]
      var question = itemResponse.getItem().getTitle()
      var answer = itemResponse.getResponse()
      payload.responses[question] = answer
    }

    var options = {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    }

    var response = UrlFetchApp.fetch(PORTAL_URL, options)
    Logger.log('Webhook sent. Status: ' + response.getResponseCode())
  } catch (error) {
    Logger.log('Webhook failed: ' + error.toString())
  }
}

function setupTrigger() {
  var form = FormApp.getActiveForm()
  if (!form) {
    Logger.log('ERROR: No active form found. Make sure this script is opened from a Google Form (Extensions -> Apps Script).')
    return
  }

  var triggers = ScriptApp.getProjectTriggers()
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'onSubmit') {
      ScriptApp.deleteTrigger(triggers[i])
    }
  }

  ScriptApp.newTrigger('onSubmit')
    .forForm(form)
    .onFormSubmit()
    .create()

  Logger.log('Trigger created. Webhook is now active.')
}

function testWebhook() {
  var payload = {
    token: CONNECTION_TOKEN,
    submittedAt: new Date().toISOString(),
    responses: {
      'Test': 'Test - ' + new Date().toISOString(),
    },
  }

  var options = {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  }

  try {
    var response = UrlFetchApp.fetch(PORTAL_URL, options)
    Logger.log('Test webhook sent. Status: ' + response.getResponseCode())
    Logger.log('Response: ' + response.getContentText())
  } catch (error) {
    Logger.log('Test webhook failed: ' + error.toString())
  }
}`
}
