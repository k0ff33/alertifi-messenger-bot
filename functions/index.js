const functions = require('firebase-functions')
const got = require('got')
const testFunctions = require('./test')

const FBTOKEN = functions.config().alertifi['fb-token']

exports.webhook = functions.https.onRequest((req, res) => {
  var data = req.body

    // Make sure this is a page subscription
  if (data.object === 'page') {
      // Iterate over each entry - there may be multiple if batched
    data.entry.forEach(function (entry) {
      var pageID = entry.id
      var timeOfEvent = entry.time

        // Iterate over each messaging event
      entry.messaging.forEach(function (event) {
        if (event.message) {
          receivedMessage(event)
        } else if (event.postback) {
          receivedPostback(event)
        } else {
          console.log('Webhook received unknown event: ', event)
        }
      })
    })

    res.sendStatus(200)
  }
})

function receivedMessage (event) {
  var senderID = event.sender.id
  var recipientID = event.recipient.id
  var timeOfMessage = event.timestamp
  var message = event.message

  console.log('Received message for user %d and page %d at %d with message:',
    senderID, recipientID, timeOfMessage)
  console.log(JSON.stringify(message))

  var messageId = message.mid

  var messageText = message.text
  var messageAttachments = message.attachments

  if (messageText) {
    // If we receive a text message, check to see if it matches a keyword
    // and send back the example. Otherwise, just echo the text we received.
    switch (messageText) {
      case 'generic':
        sendGenericMessage(senderID)
        break

      default:
        sendTextMessage(senderID, messageText)
    }
  } else if (messageAttachments) {
    sendTextMessage(senderID, 'Message with attachment received')
  }
}

function receivedPostback (event) {
  var senderID = event.sender.id
  var recipientID = event.recipient.id
  var timeOfPostback = event.timestamp

  // The 'payload' param is a developer-defined field which is set in a postback
  // button for Structured Messages.
  var payload = event.postback.payload

  console.log("Received postback for user %d and page %d with payload '%s' " +
    'at %d', senderID, recipientID, payload, timeOfPostback)

  // When a postback is called, we'll send a message back to the sender to
  // let them know it was successful
  sendTextMessage(senderID, 'Postback called')
}

function sendTextMessage (recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText
    }
  }

  callSendAPI(messageData)
}

function sendGenericMessage (recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'generic',
          elements: [{
            title: 'rift',
            subtitle: 'Next-generation virtual reality',
            item_url: 'https://www.oculus.com/en-us/rift/',
            image_url: 'http://messengerdemo.parseapp.com/img/rift.png',
            buttons: [{
              type: 'web_url',
              url: 'https://www.oculus.com/en-us/rift/',
              title: 'Open Web URL'
            }, {
              type: 'postback',
              title: 'Call Postback',
              payload: 'Payload for first bubble'
            }]
          }, {
            title: 'touch',
            subtitle: 'Your Hands, Now in VR',
            item_url: 'https://www.oculus.com/en-us/touch/',
            image_url: 'http://messengerdemo.parseapp.com/img/touch.png',
            buttons: [{
              type: 'web_url',
              url: 'https://www.oculus.com/en-us/touch/',
              title: 'Open Web URL'
            }, {
              type: 'postback',
              title: 'Call Postback',
              payload: 'Payload for second bubble'
            }]
          }]
        }
      }
    }
  }

  callSendAPI(messageData)
}

function callSendAPI (messageData) {
  got('https://graph.facebook.com/v2.6/me/messages', {
    query: {
      access_token: FBTOKEN
    },
    method: 'POST',
    body: messageData,
    json: true
  })
  .then((res) => {
    let recipientId = res.body.recipient_id
    let messageId = res.body.message_id

    console.log('Successfully sent generic message with id %s to recipient %s', messageId, recipientId)
  })
  .catch(e => {
    console.error('Unable to send message.')
    console.error(e)
  })
}

module.exports.bigben = testFunctions.bigben
module.exports.search = testFunctions.search