const mineflayer = require('mineflayer')
const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const { isPromise } = require('util/types');

// Create bot
const bot = mineflayer.createBot({
  host: 'donutsmp.net', // Replace with server IP
  port: 25565,             // Replace with server port
  username: 'Anaduo', // Replace with bot username
  version: "1.21.4",
  auth: "microsoft",
  username: "Aleksanderperak@gmail.com"
});

// Create web server
const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Serve static files
app.use(express.static('public'));


io.on('connection', (socket) => {
  socket.on('sendChat', (msg) => {
    if (bot && bot.chat) {
      if (msg == ".dumpall"){
        dumpInventoryToCurrentGUI(bot)
      }else{
        bot.chat(msg);
        console.log(`Sent to chat: ${msg}`);
      }
    }
  });

  socket.on('clickSlot', (slot) => {
    if (bot.currentWindow) {
      bot.clickWindow(slot, 0, 0); // left-click
      console.log(`Clicked slot ${slot}`);
    }
  });

});



bot.once('spawn', () => {
  loopActive = true
  startLoop()
})


// Send chat and position updates to browser
bot.on('message', (jsonMsg) => {
  const msg = jsonMsg.toString();
  // io.emit("chat", msg)
});

bot.on('kicked', (reason, loggedIn) => {
  console.log('Bot was kicked!');
  console.log('Reason:', reason);
  io.emit("chat", "Bot was kicked!")
  io.emit("chat", 'Reason:'+ reason)
});



bot.on('move', () => {
  const pos = bot.entity.position;
  io.emit('position', {
    x: pos.x.toFixed(2),
    y: pos.y.toFixed(2),
    z: pos.z.toFixed(2),
  });
});

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
  io.emit("chat", "dumping inventory")
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
      io.emit("chat", "Moved "+item.type)
    } catch (err) {
      console.log(err)
    }
  }
  io.emit('guiOpen', {
    title: container,
    type: container.type,
    slots: container.slots
  });
}

bot.on('windowOpen', (window) => {
  window.slots.forEach((item, index) => {
    if (!item) return;
  });
  const items = window.slots.map((item, index) => {
    if (!item) return null;
    return {
      slot: index,
      name: item.name,
      count: item.count,
      displayName: item.displayName,
      type: item.type
    };
  }).filter(Boolean);

  io.emit('guiOpen', {
    title: window,
    type: window.type,
    slots: window.slots
  });
});


const originalWarn = console.warn
console.warn = (...args) => {
  if (args[0] && args[0].includes('Chunk size')) return
  originalWarn(...args)
}
const itemFlipping = "exp"
async function startLoop() {
  while (loopActive) {
    try {
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
      await sleep(5000)
      if (itemFlipping == "crystal"){
        bot.chat('/order end crystal')
      }
      if (itemFlipping == "exp"){
        bot.chat('/order bottle o')
      }
      await waitForWindow()
      io.emit("chat", bot.currentWindow.title.value+"172")
      await sleep(100)
      item = bot.currentWindow.slots[0];
      let price = getPrice(item)
      io.emit("chat", price)
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
        io.emit("chat", price)
      }
      clickButton(0)
      await waitForWindow()
      io.emit("chat", bot.currentWindow.title.value+"193")
      await dumpInventoryToCurrentGUI(bot)
      await sleep(5000)
      io.emit("chat", bot.currentWindow.title.value+"196")
      await sleep(250)
      bot.closeWindow(bot.currentWindow)
      await waitForWindow()
      io.emit("chat", bot.currentWindow.title.value+"200")
      await sleep(1000)
      await clickButton(15)
      io.emit("chat", bot.currentWindow.title.value+"203")
      await waitForWindow()
      await sleep(100)
      io.emit("chat", bot.currentWindow.title.value+"206")
      bot.closeWindow(bot.currentWindow)
      await waitForWindow()
      await sleep(10)
      io.emit("chat", bot.currentWindow.title.value+"211")
      bot.closeWindow(bot.currentWindow)
      await sleep(1000)

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






setInterval(() => {
  io.emit('health', {
    health: bot.health,
  });
}, 1000); // every second


// Start server
server.listen(3000, () => {
  console.log('Web interface running at http://localhost:3000');
});