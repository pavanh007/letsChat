import {
  handleConnect,
  handleDisconnect,
  handleSendMessage,
  handleGetClients,
  handleGetMessages,
  parseGetMessageBody,
  getClient,
  parseSendMessageBody,
  responseForbidden,
  postToConnection,
  responseOK,
} from "./chatServices.mjs";
import connectToMongoDB from "./db/connect.mjs";

export async function handler(event) {
  console.log("event", event)
  if (!event.requestContext) {
    return {};
  }
  const connectionId = event.requestContext.connectionId;
  const routeKey = event.requestContext.routeKey;
  try {
    connectToMongoDB()
    console.log("connectionId", connectionId, routeKey);
    switch (routeKey) {
      case "$connect":
        return handleConnect(connectionId, event.queryStringParameters);
      case "$disconnect":
        return handleDisconnect(connectionId);
      case "getClients":
        return handleGetClients(connectionId);
      case "sendMessage":
        return handleSendMessage(
          await getClient(connectionId),
          parseSendMessageBody(event.body)
        );
      case "getMessages":
        return handleGetMessages(
          await getClient(connectionId),
          parseGetMessageBody(event.body)
        );
      default:
        return responseForbidden;
    }
  } catch (e) {
    if (e instanceof HandlerError) {
      await postToConnection(
        connectionId,
        JSON.stringify({ type: "error", message: e.message })
      );
      return responseOK;
    }
    throw e;
  }
}
