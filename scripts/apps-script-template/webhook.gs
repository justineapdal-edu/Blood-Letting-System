/**
 * Google Apps Script Webhook Template for Blood Donor Admin Portal
 *
 * Instructions:
 * 1. Open your Google Form -> Extensions -> Apps Script
 * 2. Paste this entire script
 * 3. Replace YOUR_PORTAL_URL with your deployed admin portal URL
 * 4. Replace YOUR_CONNECTION_TOKEN with the token from the Form Integration Manager
 * 5. Set up an onFormSubmit trigger:
 *    Edit -> Current project's triggers -> Add trigger ->
 *    Function: onSubmit, Event: On form submit
 */

const PORTAL_URL = 'https://your-admin-portal.com/api/webhook'
const CONNECTION_TOKEN = 'YOUR_CONNECTION_TOKEN_HERE'

function onSubmit(e) {
  const formResponse = e.response
  const itemResponses = formResponse.getItemResponses()

  const payload = {
    token: CONNECTION_TOKEN,
    submittedAt: formResponse.getTimestamp().toISOString(),
    responses: {},
  }

  itemResponses.forEach((itemResponse) => {
    const question = itemResponse.getItem().getTitle()
    const answer = itemResponse.getResponse()
    payload.responses[question] = answer
  })

  const options = {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  }

  try {
    const response = UrlFetchApp.fetch(PORTAL_URL, options)
    console.log('Webhook sent successfully:', response.getContentText())
  } catch (error) {
    console.error('Webhook failed:', error.toString())
  }
}
