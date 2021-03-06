const context = require('../context')
const {createStompitClientFactory, StompitClient, subscribeToQueue, sendFrame} = require('./mq')
const {subscriptionParameters, validateHandlerIsFunction} = require('./utils')

class PubsubClient extends StompitClient {
  /**
   * Create a PubsubClient
   * @param {*} stompitClient an instance of the `stompit`
   * @requires stompit
   * {@link http://gdaws.github.io/node-stomp/api/}
   */
  constructor(stompitClient, {logger = context.logger} = {}) {
    super(stompitClient, logger, 'PubsubClient')
    this.subscriptions = []
  }

  /**
   * Subscribe to messages from a certain queue
   * @param {String} baseOrMethod base name for the queue, or the name of the method
   * @param {String} methodOrHandler name of the method, or tha handler
   * @param {Function} handlerOrNothing callback to handle messages. {@link mq#subscribeToQueue}
   * Node style callback, of `(err, response)`.
   * `response` can be destructured to `{body, headers}`
   * @return subscription, on which you can call `unsubscribe`
   */
  subscribe(baseOrMethod, methodOrHandler, handlerOrNothing) {
    const [methodQueue, handler] = subscriptionParameters(
      baseOrMethod,
      methodOrHandler,
      handlerOrNothing
    )

    validateHandlerIsFunction('PubsubClient.subscribe()', handler)
    this.logger.info({queue: methodQueue}, 'QUEUE_SUBSCRIBED')


    const subscription = subscribeToQueue(this.client, methodQueue, (message) => {
      this.logger.info(message, 'MESSAGE_CONSUMED')
      handler(message)
    })
    this.subscriptions.push(subscription)
    return subscription
  }

  /**
   * Publishes a message to given queue
   * @param {String} queue queue to send the message to
   * @param {Object|String} body body of the message to send
   * @param {[Object]} additionalHeaders optional - additional headers to send as metadata
   */
  publish(queue, body, additionalHeaders = {}) {
    const headers = {...additionalHeaders, destination: queue}
    this.logger.info({headers, body}, 'MESSAGE_PUBLISHED')
    sendFrame(this.client, body, headers)
  }
}

/**
 * Create a {@link PubsubClient} with given configuration and options
 * @param {String|Object} config configuration for the STOMP client
 * Can be either a connection string, or an object of the following form:
 * const connectOptions = {url: String} or
 * const connectOptions = {
 *   host: String,
 *   port: Number,
 *   connectHeaders: {
 *     login?: String,
 *     passcode?: String,
 *  },
 * }
 * @param {[Object]} options options for the wrapper client
 * @see {@link PubsubClient#constructor} for available options
 */
PubsubClient.connect = createStompitClientFactory(PubsubClient)

module.exports = PubsubClient
