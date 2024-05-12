const express = require("express");
const {createServer} = require("http");
const {Server} = require("socket.io");

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer);



let Players = [];

//pixels per 10th second, playerSpeed/10 = vergelichbar mit lightspeed
let playerSpeed = 10;

let time = 0;

//Receiving and Sending
io.on("connect",(socket) => {

    console.log("User connected:",socket.id);




    socket.on("spawnPlayer",(playerName)=>{
        spawnPlayer(socket,playerName);
   })
    


    //Receiving

    socket.on("wPressed",() => {
        let playerIndex = Players.findIndex(obj => obj.id === socket.id);

        if(Players[playerIndex]){
            Players[playerIndex].y -= playerSpeed/2;
            let playerBinary = convertDataToBinary( Players[playerIndex]);
            io.emit("updatePlayer",playerBinary);
        }
    })
    socket.on("aPressed",() => {
        let playerIndex = Players.findIndex(obj => obj.id === socket.id);
        if(Players[playerIndex]){
            Players[playerIndex].x -= playerSpeed/2;
            let playerBinary = convertDataToBinary( Players[playerIndex]);
            io.emit("updatePlayer",playerBinary);
        }
    })
    socket.on("sPressed",() => {
        let playerIndex = Players.findIndex(obj => obj.id === socket.id);
        if(Players[playerIndex]){
            Players[playerIndex].y += playerSpeed/2;
            let playerBinary = convertDataToBinary( Players[playerIndex]);
            io.emit("updatePlayer",playerBinary);
        }
    })
    socket.on("dPressed",() => {
        let playerIndex = Players.findIndex(obj => obj.id === socket.id);
        if(Players[playerIndex]){
            Players[playerIndex].x += playerSpeed/2;
            let playerBinary = convertDataToBinary( Players[playerIndex]);
            io.emit("updatePlayer",playerBinary);
        }
    })

    socket.on("requestAllObjectData",()=>{
        let data = {Players:Players};
        let objectDataBinary = convertDataToBinary(data);
        socket.emit("synchronizeEveryObject",objectDataBinary);
    });

    socket.on("ping",()=>{
        socket.emit("pong");
    })
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
        let playerIndex = Players.findIndex(obj => obj.id === socket.id);
        if(Players[playerIndex]){
            Players.splice(playerIndex,1)
            io.emit("removePlayer",socket.id)
        }
    });

});


function spawnPlayer(socket,playerName){
    playerObject = {name:"player",id:socket.id,x:300,y:300,playerName:playerName,past:[]}
    Players.push(playerObject);

  


    //sending
    let player = Players.find(obj => obj.id === socket.id);
    let playerBinary = convertDataToBinary(player);
    io.emit("start", playerBinary);

}

setInterval(()=>{

    time += 1;
    io.emit("synctime",time);

    Players.forEach(player => {

        let positionST = {x:player.x,y:player.y,time:time}

        player.past.push(positionST);

        if(  player.past.length > 1000){
            player.past.splice(0,1);
        }

      });
    
      let data = convertDataToBinary(Players);

      io.emit("syncpast",data)
      Players.forEach(player => {
        player.past = [];
      });

},10);







//Host Server
app.use(express.static("../public"));
httpServer.listen(25565, () => {
  console.log("Server is running.");
});


function convertDataToBinary(obj){

    const jsonString = JSON.stringify(obj);
    const binaryData = new TextEncoder().encode(jsonString);
    return binaryData;
}


