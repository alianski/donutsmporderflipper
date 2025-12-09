const socket = io();


let tokenid = localStorage.getItem('donutcasinotoken');
console.log(tokenid)

let accountName = null
let loginCode = null

let balance = 0
let botBalance = 0

function sendChat() {
  const msg = document.getElementById('chatMessage').value;
  if (msg.trim()) {
    socket.emit('sendChat', msg);
    document.getElementById('chatMessage').value = '';
  }
}

function withdrawmoney() {
  socket.emit("withdraw", true)
}

socket.on('chat', data => {
  const chatBox = document.getElementById('chat');
  const msg = document.createElement('div');
  msg.textContent = data;
  chatBox.appendChild(msg);
  console.log(data)
  chatBox.scrollTop = chatBox.scrollHeight;
});



function formatNumber(number){
    const shorts = ["", "K", "M", "B", "T", "Qd", "Qi"]
    let shortcount = 6
    let thousands = 0
    while (number >= 1000 && thousands < shortcount){
        number = number / 1000
        thousands += 1
    }
    return Math.floor(number*10)/10+shorts[Math.min(shortcount, thousands)]
}

socket.on("data", data => {
    if ("tokenid" in data){
        localStorage.setItem('donutcasinotoken', data["tokenid"]);
    }
    if ("code" in data){
        loginCode = data["code"]
        console.log(loginCode)
        document.getElementById('loginCommand').textContent = `To link your account send command /msg AlianskiToJa login ${loginCode}`;
    }
    if ("accountName" in data){
        accountName = data["accountName"]
        console.log(accountName)
        if (accountName == null){}else{
          document.getElementById('loginCommand').textContent = `You have linked your account with ${accountName}`;
        }
    }
    if ("balance" in data){
      balance = data["balance"]
    }
    if ("botBalance" in data){
      botBalance = data["botBalance"]
    }
    document.getElementById('balance').textContent = "Balance: $"+formatNumber(balance)+" /$"+formatNumber(botBalance)
})

socket.on('position', pos => {
  document.getElementById('coords').textContent =
    `Coordinates: X: ${pos.x}, Y: ${pos.y}, Z: ${pos.z}`;
});

socket.on("connect", () => {
    console.log("You connected with id:", socket.id)
    socket.emit("tokenId", tokenid)
})
