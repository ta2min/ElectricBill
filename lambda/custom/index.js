// This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
// Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
// session persistence, api calls, and more.
const Alexa = require('ask-sdk-core');
let AWS = require('aws-sdk');
AWS.config.update({ region: 'ap-northeast-1' });
const csv = require('csv-parse/lib/sync')
const numeral = require('@geolonia/japanese-numeral')

let s3 = new AWS.S3({apiVersion: '2006-03-01'});


function S3_getObject(bucketParams) {
    return new Promise((resolve, reject) => {
        s3.getObject(
            bucketParams,
            (err, response) => {
              if (err) {
                console.log(err);
                reject(err);
              }
                else { resolve(response); }
            }
        );
    });
}

const LaunchRequestHandler = {
    canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    handle(handlerInput) {
      const speechText = '電気代ぼっとです';
      return handlerInput.responseBuilder
        .speak(speechText)
        .reprompt(speechText)
        .getResponse();
    }
};
const ElectricBillIntentHandler = {
    canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'IntentRequest'
        && handlerInput.requestEnvelope.request.intent.name === 'ElectricBillIntent';
    },
    async handle(handlerInput) {
      const date = handlerInput.requestEnvelope.request.intent.slots.when.value;
      const bucketName = process.env.S3_BUCKET_NAME;
      const keyName = `day/${date}.csv`;
      console.log(keyName);
      const bucketParams = {
        Bucket: bucketName,
        Key: keyName,
      };
      let response = await S3_getObject(bucketParams);
      let text = response.Body.toString("utf-8");
      const records = csv(text, {
        columns: false,
      });
      const total = records.reduce((sum, record,) => {
        console.log(sum, record[1], typeof (parseFloat(record[1])))
        if (record[1] !== '') {
          return sum + parseFloat(record[1]);
        } else {
          return sum;
        }
      }, 0);
      const unit_price = 29.57
      let speechText;
      if (total > 0) {
        const price = total * unit_price * 1.1;
        const kanjiDayTotal = numeral.number2kanji(Math.ceil(price))
        speechText = `${kanjiDayTotal}円です`
        console.log(`electric price: ${price}`);
      } else {
        speechText = 'ゼロ円です';
      }
      return handlerInput.responseBuilder
        .speak(speechText)
        //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
        .getResponse();
    }
};
const HelpIntentHandler = {
    canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'IntentRequest'
        && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
      const speechText = 'You can say hello to me! How can I help?';
     
      return handlerInput.responseBuilder
        .speak(speechText)
        .reprompt(speechText)
        .getResponse();
    }
};
const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'IntentRequest'
        && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
          || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
    },
   handle(handlerInput) {
      const speechText = 'Goodbye!';
      return handlerInput.responseBuilder
        .speak(speechText)
        .getResponse();
    }
};
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
    },
    handle(handlerInput) {
      // Any cleanup logic goes here.
      return handlerInput.responseBuilder.getResponse();
    }
};

// The intent reflector is used for interaction model testing and debugging.
// It will simply repeat the intent the user said. You can create custom handlers
// for your intents by defining them above, then also adding them to the request
// handler chain below.
const IntentReflectorHandler = {
    canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'IntentRequest';
    },
    handle(handlerInput) {
      const intentName = handlerInput.requestEnvelope.request.intent.name;
      const speechText = `You just triggered ${intentName}`;
 
      return handlerInput.responseBuilder
        .speak(speechText)
        //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
        .getResponse();
   }
};

// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
const ErrorHandler = {
    canHandle() {
      return true;
    },
    handle(handlerInput, error) {
      console.log(`~~~~ Error handled: ${error.message}`);
      const speechText = `Sorry, I couldn't understand what you said. Please try again.`;

      return handlerInput.responseBuilder
        .speak(speechText)
        .reprompt(speechText)
        .getResponse();
    }
};

// This handler acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    ElectricBillIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler,
    IntentReflectorHandler) // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
  .addErrorHandlers(
    ErrorHandler)
  .lambda();
  