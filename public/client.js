const socket = io();
const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');


document.addEventListener('keydown', handleKeyDown);
document.addEventListener('keyup', handleKeyUp);

const nameForm = document.getElementById('nameForm');
const nameInput = document.getElementById('nameInput');



socket.on('connect', () => {
  socket.emit("requestAllObjectData");
  console.log('Connected to server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});


let Players = [];
let posSTData;



let ping = 0;
let pingStartTime = Date.now();



//pixels per 100th second
const speedOfLight  = 2;

let isWPressed = false;
let isAPressed = false;
let isSPressed = false;
let isDPressed = false;

let clientTime = 0;


socket.on("synctime",(time)=>{

clientTime = time;

});

socket.on("syncpast",(data)=>{
    if (data instanceof ArrayBuffer) {
        let binaryData = data;
        let jsonString = new TextDecoder().decode(binaryData);
        let array = JSON.parse(jsonString);
        Players.forEach((player)=>{
            let player2 = array.find(obj=>obj.id===player.id)
            player.past = player.past.concat(player2.past); 
            if(player.past.length > 1000){
                let howMany = player.past.length-1000;
                player.past.splice(0,howMany);
            }
        })

    }
   
});
    



socket.on("synchronizeEveryObject",(objectDataBinary)=>{
    if (objectDataBinary instanceof ArrayBuffer) {
        let binaryData = objectDataBinary;
        let jsonString = new TextDecoder().decode(binaryData);
        let obj2 = JSON.parse(jsonString);

        Players = obj2.Players;
    }
})







socket.on("start",(message)=>{

    if (message instanceof ArrayBuffer) {
        let binaryData = message;
        let jsonString = new TextDecoder().decode(binaryData);
        let obj2 = JSON.parse(jsonString);
        
        if(obj2.name == "player"){
            let player = Players.find(obj => obj.id === obj2.id);
            if(!player){
                Players.push(obj2)
            }
        }



      }
});

socket.on("updatePlayer",(binaryData)=> {

    if (binaryData instanceof ArrayBuffer) {
        let jsonString = new TextDecoder().decode(binaryData);
        let obj2 = JSON.parse(jsonString);
        
        let playerIndex = Players.findIndex(obj => obj.id === obj2.id);

        let past =  Players[playerIndex].past;
        Players[playerIndex] = obj2;
        Players[playerIndex].past = past;
      }


});

socket.on("removePlayer", (id)=>{

    let playerIndex = Players.findIndex(obj => obj.id === id);
    Players.splice(playerIndex,1)

});

setInterval(sendPlayerMovement,50);

function sendPlayerMovement(){
    
    if(isWPressed){
        socket.emit("wPressed");
    }

    if(isAPressed){
        socket.emit("aPressed");
        
    }
    
    if(isSPressed){

        socket.emit("sPressed");
    }
    
    if(isDPressed){
        socket.emit("dPressed");
        
    }

}

setInterval(()=>{
    
     pingStartTime = Date.now();

    socket.emit('ping')
    
},3000);

socket.on('pong',()=>{

   ping = Date.now() - pingStartTime;

})










function calculateTimeDelay(distance) {
    return distance / speedOfLight;
}

function findVisiblePastObjects(players, mainPlayer) {
    let visiblePastObjects = [];

    players.forEach(player => {
        if (player.id !== mainPlayer.id) {
            player.past.forEach(pastObject => {
                const distance = Math.sqrt(Math.pow(pastObject.x - mainPlayer.x, 2) + Math.pow(pastObject.y - mainPlayer.y, 2));
                const timeDelay = calculateTimeDelay(distance);
                const pastObjectTime = pastObject.time;
                const currentTime = clientTime;
                const lightTravelTime = currentTime - timeDelay; // Convert time delay to milliseconds

                // Check if the past object's time is close to the calculated light travel time
                if (Math.abs(pastObjectTime - lightTravelTime) <= 2) { 
                    visiblePastObjects.push({
                        playerId: player.id,
                        playerName:player.playerName,
                        x: pastObject.x,
                        y: pastObject.y,
                        time: pastObjectTime
                    });
                }
            });
        }
    });

    return visiblePastObjects;
}




function animate() {
   ctx.fillStyle  = "black"
   ctx.fillRect(0, 0, canvas.width, canvas.height);
  
   ctx.fillStyle  = "white"
   ctx.font = 'bold 12px Arial';
  
   ctx.fillText("ping: " + ping, 20, 60);
   
    let player = Players.find(obj=>obj.id === socket.id)
        
    if(player){
        ctx.fillText("x: " + player.x, 20, 20);
        ctx.fillText("y: " + player.y, 20, 40);




        ctx.beginPath();
        ctx.arc(player.x, player.y, 10, 0, 2 * Math.PI); // Radius of 20 pixels
        ctx.fillStyle = 'red'; // Set the fill color
        ctx.fill(); // Draw the filled circle
        ctx.font = '16px Arial';
        ctx.fillStyle = 'green';
        ctx.fillText(player.playerName, player.x, player.y - 20);
    

        const visiblePastObjects = findVisiblePastObjects(Players, player);
        visiblePastObjects.forEach(pos => {
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 10, 0, 2 * Math.PI); // Radius of 20 pixels
            ctx.fillStyle = 'red'; // Set the fill color
            ctx.fill(); // Draw the filled circle
            ctx.font = '16px Arial';
            ctx.fillStyle = 'green';
            ctx.fillText(pos.playerName, pos.x, pos.y - 20);


        });
    }

            

    
   
    requestAnimationFrame(animate);
  }

  function handleKeyDown(event) {
   
    if(event.key === "w"){
        isWPressed = true;
    }
    if(event.key === "a"){
        isAPressed = true;
    }
    if(event.key === "s"){
        isSPressed = true;
    }
    if(event.key === "d"){
        isDPressed = true;
    }

  }
  



  function handleKeyUp(event) {
     if(event.key === "w"){
        isWPressed = false;
    }
    if(event.key === "a"){
        isAPressed = false;
    }
    if(event.key === "s"){
        isSPressed = false;
    }
    if(event.key === "d"){
        isDPressed = false;
    }
  }

  nameForm.addEventListener('submit', (event) => {
    event.preventDefault(); // Prevent form from reloading the page
    const playerName = nameInput.value.trim();
    if (playerName) {
      // Spawn the player with the entered name
      socket.emit("spawnPlayer",playerName);
      
      // Hide the name form
      nameForm.style.display = 'none';
    }
  });




animate();