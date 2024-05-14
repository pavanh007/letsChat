import AWS from "aws-sdk";
import Client from "./db/models/Client.mjs";
import Message from "./db/models/Message.mjs";
const APIGateway = new AWS.ApiGatewayManagementApi({
  endpoint: process.env["WSSAPIGATEWAYENDPOINT"],
});

export const responseOK = {
  statusCode: 200,
  body: "",
};

export const responseForbidden = {
  statusCode: 403,
  body: "",
};


export const postToConnection = async (connectionId, messageBody) => {
  try {
    await APIGateway.postToConnection({
      ConnectionId: connectionId,
      Data: messageBody,
    }).promise();
    return true;
  } catch (e) {
    if (isConnectionNotExistError(e)) {
      await Client.deleteOne({ connectionId: connectionId }).promise();
      return false;
    } else {
      throw e;
    }
  }
};

const isConnectionNotExistError = (e) => e.statusCode === 410;


export const handleConnect = async (conId, queryParams) => {
  try {
    const connectionId = conId;
    const name = queryParams ? queryParams.name : null;
    const isUserExist = await Client.find({
      connectionId: connectionId,
    });
    if (
      isUserExist &&
      (await postToConnection(connectionId, JSON.stringify({ type: "ping" })))
    ) {
      return responseForbidden;
    }
    await Client.create({
      connectionId: connectionId,
      nickname: name || "patient",
    });
  } catch (error) {
    return responseForbidden;
  }
};
export const handleDisconnect = async (connectionId) => {
  await Client.deleteOne({
    connectionId: connectionId,
  }).promise();
  await notifyClientChange(connectionId);

  return responseOK;
};


const notifyClientChange = async (excludedConnectionId) => {
  const patients = await Client.find({});

  await Promise.all(
    patients.map(async (c) => {
      if (excludedConnectionId === c.connectionId) {
        return;
      }
      await postToConnection(
        c.connectionId,
        JSON.stringify({ type: "clients", value: patients })
      );
    })
  );
};

export const handleGetClients = async (connectionId) => {
  await postToConnection(
    connectionId,
    JSON.stringify({
      type: "clients",
      value: await getAllClients(),
    })
  );

  return responseOK;
};

const getNicknameToNickname = (nicknames) =>
  nicknames.sort().join("#");


export const handleSendMessage = async (client, body) => {
  const nicknameToNickname = getNicknameToNickname([
    client.nickname,
    body.recipientNickname,
  ]);

  await Message.findOneAndUpdate(
    { firstName: client.nickname },
    {
      messageId: v4(),
      nicknameToNickname: nicknameToNickname,
      message: body.message,
      sender: client.sender
    }
  )

  const recipientConnectionId = await getConnectionIdByNickname(
    body.recipientNickname
  );
  if (recipientConnectionId) {
    await APIGateway.postToConnection({
      ConnectionId: recipientConnectionId,
      Data: JSON.stringify({
        type: "message",
        value: {
          sender: client.nickname,
          message: body.message,
        },
      }),
    });
  }
  return responseOK;
};


export const getClient = async (connectionId) => {
  const user = await Client.find({connectionId: connectionId})
  if (!user) {
    throw new HandlerError("client does not exist");
  }
  return user;
};


export const parseGetMessageBody = (body) => {
  const getMessagesBody = JSON.parse(body || "{}");

  if (
    !getMessagesBody ||
    !getMessagesBody.targetNickname ||
    !getMessagesBody.limit
  ) {
    throw new HandlerError("invalid GetMessageBody");
  }

  return getMessagesBody;
};

export const handleGetMessages = async (client, body) => {
  try {
    const output = await Message.find({
      nicknameToNickname: {
        $in: [client.nickname, body.targetNickname],
      },
    })
      .limit(body.limit)
      .sort({ createdAt: -1 })
      .exec();

    await postToConnection(
      client.connectionId,
      JSON.stringify({
        type: "messages",
        value: {
          messages: output && output.length > 0 ? output : []
        },
      })
    );

    return responseOK;
  } catch (error) {
    console.error("Error fetching messages:", error);
    return responseForbidden;
  }
};


export const parseSendMessageBody = (body) => {
  const sendMsgBody = JSON.parse(body || "{}");
  if (!sendMsgBody || !sendMsgBody.recipientNickname || !sendMsgBody.message) {
    throw new HandlerError("invalid SendMessageBody");
  }
  return sendMsgBody;
};