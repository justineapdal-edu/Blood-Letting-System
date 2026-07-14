/**
 * Google Apps Script Webhook Template for Blood Donor Admin Portal
 *
 * Instructions:
 * 1. Open your Google Form -> Extensions -> Apps Script
 * 2. Paste this entire script
 * 3. Replace YOUR_PORTAL_URL with your deployed admin portal URL
 * 4. Replace YOUR_CONNECTION_TOKEN with the token from the Form Integration Manager
 * 5. Run setupTrigger() first to authorize and create the trigger
 *    (Run -> setupTrigger, then complete the authorization prompt)
 * 6. Test with testWebhook() to verify connectivity
 */

const PORTAL_URL = 'https://your-admin-portal.com/api/webhook'
const CONNECTION_TOKEN = 'YOUR_CONNECTION_TOKEN_HERE'

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
    Logger.log('ERROR: No active form found. Make sure this script is opened from a Google Form.')
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
}
