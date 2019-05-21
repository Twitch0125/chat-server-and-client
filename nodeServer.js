const net = require("net");
const uuidv4 = require("uuid/v4");
const fs = require("fs");
let randomName = require("random-name");
process.stdin.setEncoding("utf8");
let clients = [];
const serverStuff = fs.createWriteStream("chat.log");
//log function because I tired of writing serverStuff.write(data, "UTF8")
function log(data) {
  serverStuff.write(data, "UTF8");
}
const encoding = "utf8";
let server = net
  .createServer(client => {
    client.write("Hello! Welcome to the chat room! \n");
    let newId = uuidv4();
    let newName = randomName();
    log(`new dude: ${newName}\n`);
    clients.forEach(currClient => {
      currClient.client.write(`new dude: ${newName}`); //tell all other clients who the new person is
    });
    clients.push({ id: newId, client: client, name: newName });
    client.write(`your id is: ${newId}\n`);
    client.write(`your name is: ${newName}`);
    client.on("data", data => {
      log(`${newName}: ${data}\n`);
      clients.forEach(currClient => {
        //broadcast message to every user except the user that sent it
        if (currClient.client != client) {
          currClient.client.write(`${newName}: ${data}`);
        }
      });
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
