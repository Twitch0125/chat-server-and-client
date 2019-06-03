const net = require("net");
const uuidv4 = require("uuid/v4");
const fs = require("fs");
let randomName = require("random-name");
process.stdin.setEncoding("utf8");
let clients = [];
const serverStuff = fs.createWriteStream("chat.log");

const adminPassword = "admin";

//log function because I tired of writing serverStuff.write(data, "UTF8")
function log(data) {
  serverStuff.write(data, "UTF8");
}
function whisper(sender, receiver, message) {
  log(`${sender} to ${receiver.name}: ${message}`);
  receiver.client.write(`from ${sender}: ${message}`);
}

function writeToAll(message) {
  log(message);
  clients.forEach(currClient => {
    currClient.client.write(message, "ascii");
  });
}

function writeToSome(exception, message) {
  log(message);
  clients.forEach(currClient => {
    //broadcast message to every user except the user that sent it
    if (currClient.client != exception) {
      currClient.client.write(message);
    }
  });
}

function updateUsername(clientName, newUserName) {
  log(`${clientName} changing name to ${newUserName}`);
  let receiver = clients.find(client => {
    if (client.name == clientName) {
      return client;
    }
  });
  clients = clients.filter(client => client.name != clientName);
  receiver.name = newUserName;
  clients.push(receiver);
}

function showClients(client) {
  log(`a client called showClients: `);
  client.write(`Currently Connected Clients: \n`);
  clients.forEach(clientObj => {
    log(`${clientObj.name}`);
    client.write(`${clientObj.name}\n`);
  });
}

const encoding = "utf8";
let server = net
  .createServer(client => {
    client.write("Hello! Welcome to the chat room! \n");
    let newId = uuidv4();
    let newName = randomName.first();
    writeToAll(`new dude: ${newName}`);
    clients.push({ id: newId, client: client, name: newName });
    client.write(`your id is: ${newId}\n`);
    client.write(`your name is: ${newName}\n`);
    showClients(client);
    client.on("data", data => {
      log(`${newName}: ${data}\n`);
      data = data.toString();
      if (data[0] == "/") {
        if (data.includes("/w")) {
          /*usage:
          /w user1 hey you're kinda cool
          results in user1 receiving a message from the sender
          */
          let command = data.toString();
          command = command.split(" ");
          let receiver = clients.find(client => {
            if (client.name == command[1]) {
              return client.client;
            }
          });
          if (!receiver) {
            client.write("client not found!");
            return 0;
          }
          if (receiver.name == newName) {
            client.write(
              "You're talking to yourself. Thats a side effect of insanity you know..."
            );
            return 0;
          }
          command.splice(0, 2);
          if (command.length == 0 || command[0] == "\n") {
            client.write("hey, you need to write a message");
            return 0;
          }
          const msgReducer = (accumulator, currentValue) =>
            accumulator + " " + currentValue;
          let message = command.reduce(msgReducer);
          whisper(newName, receiver, message);
        } else if (data.includes("/username")) {
          /*usage:
          /username Kaleb
          results in username being changed to Kaleb
          */
          let command = data.toString();
          command = command.split(" ");
          if (command.length < 1) {
            client.write("you need to provide a new username...");
            return 0;
          }
          let name = [...command[1]]; //split each character including the /n at the end
          name.pop(); //should remove the /n
          const nameReducer = (accumulator, currentValue) =>
            accumulator + currentValue;
          let oldName = newName;
          newName = name.reduce(nameReducer);
          updateUsername(oldName, newName);
          client.write(`your new username is : ${newName}`);
          writeToSome(client, `${oldName} changed their name to ${newName}`);
        } else if (data.includes("/kick")) {
          /* usage:
          /kick username adminPassword
          client with given username gets kicked and disconnected from server
          */
          let command = data.toString();
          command = command.split(" ");
          let clientName = command[1];
          if (clientName == newName) {
            client.write("Really? You're trying to kick yourself?");
            return 0;
          }
          let password = [...command[2]]; //get the password and remove the /n char
          password.pop(); //removes the /n
          const passwordReducer = (accumulator, currentValue) =>
            accumulator + currentValue;
          password = password.reduce(passwordReducer); //combine into a string again
          if (password != adminPassword) {
            client.write("Wrong Password!");
          } else {
            let receiver = clients.find(client => {
              if (client.name == clientName) {
                return client.client;
              }
            });
            log(`${newName}is kicking ${receiver.name}`);
            receiver.client.end("you have been kicked!");
          }
        } else if (data.includes("/clientlist")) {
          showClients(client);
        } else {
          client.write("unknown command");
        }
      } else {
        writeToSome(client, `${newName}: ${data}`);
      }
    });
    client.on("close", () => {
      log(`${newName} has fled the server\n`);
      clients = clients.filter(currClient => currClient.client.writable); //remove any clients that are no longer available.
      clients.forEach(currClient => {
        currClient.client.write(`${newName} has fled the server`);
      });
    });
  })
  .listen(5000);
console.log("listening on port 5000");
