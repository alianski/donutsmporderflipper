const mineflayer = require('mineflayer')
const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const { isPromise } = require('util/types');
const path = require('path');
const fs = require('fs');
const { Pool } = require("pg");
const { send } = require('process');
const pool = new Pool({ connectionString: "postgresql://postgres:eVCJGwpAfCyOwijQvnAHGplsPrgoaRwx@shortline.proxy.rlwy.net:41192/railway",
           ssl: { rejectUnauthorized: false } });


let botBalance = 10

function updateBalance(username, balance){
  for (const tokenid in players) {
    if (players[tokenid]["accountName"] == username) {
      for (const id in connectedTokens){
        if (connectedTokens[id] == tokenid){
          io.to(id).emit("data", {"balance": balance})
          console.log(id)
        }
      }
  }
}

}


async function addBalance(username, amount) {
  await pool.query(
    `INSERT INTO users_money (username, balance)
     VALUES ($1, $2)
     ON CONFLICT (username) DO UPDATE
     SET balance = users_money.balance + EXCLUDED.balance`,
    [username, amount]
  );
  console.log(`✅ Added ${amount} to ${username}'s balance`);
}
   

async function setBalance(username, amount) {
  await pool.query(
    `INSERT INTO users_money (username, balance)
     VALUES ($1, $2)
     ON CONFLICT (username) DO UPDATE SET balance = $2`,
    [username, amount]
  );
}

async function getBalance(username) {
  const res = await pool.query("SELECT balance FROM users_money WHERE username = $1", [username]);
  return res.rows[0]?.balance ?? 0;
}

// Create bot
function startBot(){
  const botHere = mineflayer.createBot({
  host: 'donutsmp.net', // Replace with server IP
  port: 25565,             // Replace with server port
  username: 'Anaduo', // Replace with bot username
  version: "1.21.4",
  auth: "microsoft",
  username: "Aleksanderperak@gmail.com"
  });

  botHere.once('spawn', () => {
    bot = botHere
    loopActive = true
    startLoop()
  })



  botHere.on('windowOpen', (window) => {
    io.emit('data', {"chat": window.title.value});
  });


  
  botHere.on('message', (jsonMsg) => {
    const msg = jsonMsg.toString();
    //io.emit("data", {"chat": msg})
    if (msg.includes("-> YOU: login")){
      let result = parseLoginString(msg);
      console.log(result.name)
      console.log(result.code)
      console.log(players)
      Object.values(players).forEach(value => {
        if (value["code"] == result.code && value["accountName"] == null){
          value["accountName"] = result.name
        }
        saveUser(value["tokenid"])
      });
    }
    if (msg.includes("paid you")){
      if (!msg.includes(":")){
        result = parsePayment(msg)
        addBalance(result.username, result.amount)
          .then(() => getBalance(result.username))
            .then(balance => {
              console.log(`💰 ${result.username}'s new balance:`, balance);
              updateBalance(result.username, balance)
          })
        .catch(err => console.error("DB error:", err));
      }
      }
    if (msg.includes("You have $")){
      result = extractNumber(msg)
      console.log(result)
      botBalance = result
      if (botBalance >= 2000000){
        commandQueue[commandQueue.length] = "/pay AlekiMichal 1M"
      }
      io.emit("data", {"botBalance": result})
    }
  });


  botHere.on('kicked', (reason, loggedIn) => {
    loopActive = false
    console.log('Bot was kicked!');
    console.log('Reason:', reason);
    setTimeout(startBot, 5000)
  });

  botHere.on('end', () => {
    loopActive = false
    console.log('Disconnected. Reconnecting in 5s...')
    setTimeout(startBot, 5000)
  })
  
  return botHere
  }
let bot = startBot()
// Create web server
const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Serve static files
app.use(express.static('public'));
app.get("/ping", (req, res) => res.send("OK"));

let commandQueue = []

let players = {}
let connectedTokens = {}

function generateRandomToken(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  do {
    result = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      result += characters[randomIndex];
    }
  } while (players.hasOwnProperty(result));

  return result;
}


function saveUsers(datatosave){
    for (let key in datatosave) {
        console.log(key)
        jsonData = JSON.stringify(datatosave[key], null, 2);
        dirPath = path.join(path.join(__dirname, 'savedata'), "users")
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath);
        }
        const filePath = path.join(dirPath, key+'.json');
        fs.writeFile(filePath, jsonData, (err) => {
            if (err) {
                console.error('Error writing to file:', err);
            } else {}
        });   
    }
}

function saveUser(tokenid){
  let data = {}
  data[tokenid] = players[tokenid]
  saveUsers(data)
}

io.on('connection', (socket) => {
  console.log(socket.id)
  socket.on('disconnect', () => {
      delete players[connectedTokens[socket.id]]
      delete connectedTokens[socket.id]
      console.log('User disconnected',socket.id);
  });
  connectedTokens[socket.id] = null
  socket.on("tokenId", (tokenid) =>{
    console.log(players)
    saveUsers(players)
    if (tokenid == null){
      tokenid = generateRandomToken(16)
    }
    connectedTokens[socket.id] = tokenid
    try {
      players[tokenid] = require("./savedata/users/"+tokenid+".json")
    }catch{
      const newPlayer = {"tokenid": tokenid, "accountName": null, "code": generateRandomToken(6)}
      players[tokenid] = newPlayer
    }
    let sending = players[tokenid]
    getBalance(players[tokenid]["accountName"]).then(balance => {
      sending["balance"] = balance
    });
    sending["botBalance"] = botBalance
    socket.emit("data", sending)
    saveUser(tokenid)
  })
  socket.on('sendChat', (msg) => {
    if (bot && players[connectedTokens[socket.id]]["accountName"] == "AlekiMichal") {
      commandQueue[commandQueue.length] = msg
      console.log(commandQueue)
    }
  });

  socket.on('withdraw', (all) => {
    if (bot && players[connectedTokens[socket.id]]["accountName"] != null) {
      getBalance(players[connectedTokens[socket.id]]["accountName"]).then(balance => {
                  if (balance >= 1){
                    commandQueue[commandQueue.length] = "/pay "+players[connectedTokens[socket.id]]["accountName"]+" "+balance
                    console.log(commandQueue)
                    setBalance(players[connectedTokens[socket.id]]["accountName"], 0).then(() => {
                      console.log("Wielkie tłuste zero!")
                      updateBalance(players[connectedTokens[socket.id]]["accountName"], 0)
                    })
                  }
          })
    }
  });

  socket.on('clickSlot', (slot) => {
    if (bot.currentWindow) {
      bot.clickWindow(slot, 0, 0); // left-click
      console.log(`Clicked slot ${slot}`);
    }
  });

});



function extractNumber(str) {
  // Match the number part and optional suffix (K/M/B)
  const match = str.match(/([\d,.]+)([KMB]?)/i);
  if (!match) return NaN;

  let [ , numStr, suffix ] = match;

  // Remove commas
  numStr = numStr.replace(/,/g, '');

  let multiplier = 1;
  switch (suffix.toUpperCase()) {
    case 'K': multiplier = 1_000; break;
    case 'M': multiplier = 1_000_000; break;
    case 'B': multiplier = 1_000_000_000; break;
  }

  return parseFloat(numStr) * multiplier;
}



function parsePayment(str) {
  // Extract the first word (username)
  const username = str.split(" ")[0];

  // Regex to capture the $ amount with optional suffix
  const match = str.match(/\$([\d,.]+)([KMB]?)/);

  let amount = 0;
  if (match) {
    let num = parseFloat(match[1].replace(/,/g, ""));
    const suffix = match[2];

    // Handle suffix multipliers
    if (suffix === "K") num *= 1_000;
    else if (suffix === "M") num *= 1_000_000;
    else if (suffix === "B") num *= 1_000_000_000;

    amount = num;
  }

  return { username, amount };
}




function parseLoginString(str) {
  // Get the part before "->"
  const name = str.split("->")[0].trim();

  // Regex to capture the word after "login"
  const match = str.match(/login\s+(\S+)/);
  const code = match ? match[1] : null;

  return { name, code };
}



function parseCurrency(str) {
  // Remove leading $ and commas
  let clean = str.replace(/\$/g, '').replace(/,/g, '').trim()

  // Handle suffixes
  let multiplier = 1
  if (clean.endsWith('K')) {
    multiplier = 1_000
    clean = clean.slice(0, -1)
  } else if (clean.endsWith('M')) {
    multiplier = 1_000_000
    clean = clean.slice(0, -1)
  } else if (clean.endsWith('B')) {
    multiplier = 1_000_000_000
    clean = clean.slice(0, -1)
  }

  // Convert to float and apply multiplier
  return parseFloat(clean) * multiplier
}

function getPrice(item) {
  if (!item || !item.components || !item.components[1].data[4].value.extra.value.value[0].text.value) return null
  return parseCurrency(item.components[1].data[1].value.extra.value.value[0].text.value)
}

async function dumpInventoryToCurrentGUI(bot) {
  const container = bot.currentWindow;

  const inventoryItems = bot.inventory.items();
  if (inventoryItems.length === 0) {
    return;
  }

  for (const item of inventoryItems) {
    await sleep(100)
    try {
      await bot.transfer({
        window: container,
        itemType: item.type,
        metadata: item.metadata,
        count: item.count,
        sourceStart: bot.inventory.inventoryStart+27,
        sourceEnd: bot.inventory.inventoryEnd+36,
        destStart: 0,
        destEnd: container.slots.length
      });
    } catch (err) {
      console.log(err)
    }
  }
}




const originalWarn = console.warn
console.warn = (...args) => {
  if (args[0] && args[0].includes('Chunk size')) return
  originalWarn(...args)
}
const itemFlipping = "exp"
async function startLoop() {
  while (loopActive) {
    try {
      bot.chat("/bal")
      await sleep(500)
      bot.chat('/shop')
      await waitForWindow()
      await clickButton(13)
      await waitForWindow()
      if (itemFlipping == "crystal"){
        await clickButton(10)
      }
      if (itemFlipping == "exp"){
        await clickButton(16)
      }
      await waitForWindow()
      await clickButton(17)
      if (true){
        for (let i = 0; i < 36; i++) {
          await sleep(10)
          await clickButton(23)
        }
      }
      await sleep(1000)
      if (itemFlipping == "crystal"){
        bot.chat('/order end crystal')
      }
      if (itemFlipping == "exp"){
        bot.chat('/order bottle o')
      }
      await waitForWindow()
      await sleep(50)
      item = bot.currentWindow.slots[0];
      let price = getPrice(item)
      console.log(price)
      while (price <= 100){
        bot.closeWindow(bot.currentWindow)
        await sleep(100)
        if (itemFlipping == "crystal"){
          bot.chat('/order end crystal')
        }
        if (itemFlipping == "exp"){
          bot.chat('/order bottle o')
        }
        await waitForWindow()
        await sleep(5000)
        item = bot.currentWindow.slots[0];
        price = getPrice(item)
        console.log(price)
        for (let i = 0; i < commandQueue.length; i++) {
          bot.chat(commandQueue[i]);
          console.log(`Sent to chat: ${commandQueue[i]}`);
          await sleep(500)
        }
        commandQueue = []
      }
      clickButton(0)
      await waitForWindow()
      await dumpInventoryToCurrentGUI(bot)
      await sleep(250)
      bot.closeWindow(bot.currentWindow)
      await waitForWindow()
      await sleep(100)
      await clickButton(15)
      await waitForWindow()
      await sleep(100)
      bot.closeWindow(bot.currentWindow)
      await waitForWindow()
      await sleep(10)
      bot.closeWindow(bot.currentWindow)
      await sleep(500)
      
      for (let i = 0; i < commandQueue.length; i++) {
        bot.chat(commandQueue[i]);
        console.log(`Sent to chat: ${commandQueue[i]}`);
        await sleep(500)
      }
      commandQueue = []

    } catch (err) {
      console.log('Loop error:', err)
    }
  }
}

function waitForWindow() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject('Window timeout'), 5000)
    bot.once('windowOpen', (window) => {
      clearTimeout(timeout)
      resolve(window)
    })
  })
}

function clickButton(slot) {
  return bot.clickWindow(slot, 0, 0)
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}




// Start server
server.listen(3000, () => {
  console.log('Web interface running at http://localhost:3000');
});