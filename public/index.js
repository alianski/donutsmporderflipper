const socket = io();


let tokenid = localStorage.getItem('donutcasinotoken');
console.log(tokenid)

let accountName = null
let loginCode = null
let admin = false

socket.on('chat', data => {
  const chatBox = document.getElementById('chat');
  const msg = document.createElement('div');
  msg.textContent = data;
  chatBox.appendChild(msg);
  console.log(data)
  chatBox.scrollTop = chatBox.scrollHeight;
});

socket.on("data", data => {
    if ("tokenid" in data){
        localStorage.setItem('donutcasinotoken', data["tokenid"]);
    }
    if ("accountName" in data){
        accountName = data["accountName"]
        console.log(accountName)
    }
    if ("code" in data){
        loginCode = data["code"]
        console.log(loginCode)
        document.getElementById('loginCommand').textContent = `To link your account send command /msg AlianskiToJa login ${loginCode}`;
    }
    if ("admin" in data){
        admin = data["admin"]
        console.log(admin)
    }
})

socket.on('position', pos => {
  document.getElementById('coords').textContent =
    `Coordinates: X: ${pos.x}, Y: ${pos.y}, Z: ${pos.z}`;
});

socket.on("connect", () => {
    console.log("You connected with id:", socket.id)
    socket.emit("tokenId", tokenid)
})

function sendChat() {
  const msg = document.getElementById('chatMessage').value;
  if (msg.trim()) {
    socket.emit('sendChat', msg);
    document.getElementById('chatMessage').value = '';
  }
}

function getLore(item){
  const rawLore = item.nbt?.value?.display?.value?.Lore?.value?.value;

  if (Array.isArray(rawLore)) {
    const loreLines = rawLore.map(line => {
      try {
        const parsed = JSON.parse(line);
        if (Array.isArray(parsed.extra)) {
          return parsed.extra.map(part => part.text).join('');
        }
        return parsed.text || line;
      } catch {
        return line;
      }
    });
  return(loreLines)
  }
}


socket.on('guiOpen', data => {
  console.log(data.title)
  document.getElementById('gui-title').textContent = `GUI: ${data.title.title.value} (${data.type})`;
  const list = document.getElementById('gui-items');
  list.innerHTML = '';

  data.slots.map((item, index) => {
    if (!item) return;
    const li = document.createElement('li');

    li.textContent = `${item.count}x ${item.displayName || item.name} ${getLore(item)} (Slot ${index})`;

    const btn = document.createElement('button');
    btn.textContent = 'Click';
    btn.onclick = () => {
      socket.emit('clickSlot', item.slot);
    };

    li.appendChild(btn);
    list.appendChild(li);
  });
});
    
socket.on('health', data => {
  document.getElementById('health').textContent = `Health: ${data.health}`;
});    