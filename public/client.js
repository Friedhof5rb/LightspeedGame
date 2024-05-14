const socket = io();
const canvas = document.getElementById('myCanvas');
const customCursor = document.getElementById('customCursor');
const ctx = canvas.getContext('2d');


document.addEventListener('keydown', handleKeyDown);
document.addEventListener('keyup', handleKeyUp);

const nameForm = document.getElementById('nameForm');
const nameInput = document.getElementById('nameInput');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

  }
  
resizeCanvas();

window.addEventListener('resize', resizeCanvas);


canvas.addEventListener("mouseover", () => {
    canvas.style.cursor = "none"; // Change cursor on mouseover
    customCursor.style.display = 'block';
  });
  
  canvas.addEventListener("mouseout", () => {
    canvas.style.cursor = "default"; // Reset cursor on mouseout
    customCursor.style.display = 'none';
  });



window.addEventListener('mousemove', (e) => {
    customCursor.style.left = `${e.clientX}px`;
    customCursor.style.top = `${e.clientY}px`;
  });

socket.on('connect', () => {
  socket.emit("requestAllObjectData");
  console.log('Connected to server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});


let Players = [];
let Bullets = [];

class MyObject {
    constructor() {
      // Initialize object properties
      this.x = 0;
      this.y = 0;
      // ... other properties
    }
  
    // Object methods
    update(x,y) {
      this.x = x;
      this.y = y;
    }
  
    render() {
     
      ctx.beginPath();
      ctx.arc(this.x, this.y, 4, 0, 2 * Math.PI); // 
      ctx.fillStyle = 'rgb(255,165,0)'; // Set the fill color
      ctx.shadowColor = 'rgba(255,165,0,0.8)';
      ctx.fill(); // Draw the filled circle
  
    }
  
    // Reset method to prepare the object for reuse
    reset() {
      this.x = 1000000;
      this.y = 1000000;
      // Reset other properties
    }
  }
  
  
  
  class ObjectPool {
      constructor(initialSize) {
        this.pool = [];
        this.initialSize = initialSize;
        this.createInitialObjects();
      }
    
      createInitialObjects() {
        for (let i = 0; i < this.initialSize; i++) {
          this.pool.push(new MyObject());
        }
      }
    
      acquire() {
        if (this.pool.length === 0) {
          // Create a new object if the pool is empty
          return new MyObject();
        }
        // Get an object from the pool
        return this.pool.pop();
      }
    
      release(obj) {
        // Reset the object before releasing it back to the pool
        obj.reset();
        this.pool.push(obj);
      }
    }
  




const objectPool = new ObjectPool(10);

let posSTData;

let mainPlayer;

let ping = 0;
let pingStartTime = Date.now();

let visiblePastBullets = [];
let visiblePastObjects = [];
//pixels per 100th second
const speedOfLight  = 3;

let isWPressed = false;
let isAPressed = false;
let isSPressed = false;
let isDPressed = false;


const buffer = [];
const MAX_BUFFER_SIZE = 200;

let clientTime = 0;


let testdatacount = 0;


socket.on("buffered-data",(packet)=>{

    for (const dataObj of packet) {
       let data = dataObj.data;
       switch(dataObj.name){
            case "synctime":
                clientTime = data;
            break;
            case "syncpast":
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
            break;
            case "syncbullets":
                if (data instanceof ArrayBuffer) {
                    let binaryData = data;
                    let jsonString = new TextDecoder().decode(binaryData);
                    let array = JSON.parse(jsonString);
            
                    array.forEach((bulletobj)=>{
                        let bulletIndex = Bullets.findIndex(obj=>obj.id===bulletobj.id)
                        if(Bullets[bulletIndex]){
                            Bullets[bulletIndex].past = Bullets[bulletIndex].past.concat(bulletobj.past); 
                            if(Bullets[bulletIndex].past.length > 500){
                                let howMany = Bullets[bulletIndex].past.length-500;
                                Bullets[bulletIndex].past.splice(0,howMany);
                            }
                        }else{
                            Bullets.push(bulletobj);
                        }
                      
                    })
            
                    for (let i = Bullets.length - 1; i >= 0; i--) {
                        let checkBullet = array.find(obj=>obj.id===Bullets[i].id)
                        if(!checkBullet){
                            Bullets.splice(i,1);
                        }
                    }
                }
            break;
            case "synchronizeEveryObject":
                if (data instanceof ArrayBuffer) {
                    let binaryData = data;
                    let jsonString = new TextDecoder().decode(binaryData);
                    let obj2 = JSON.parse(jsonString);
            
                    Players = obj2.Players;
                }
            break;
            case "start":
                if (data instanceof ArrayBuffer) {
                    let binaryData = data;
                    let jsonString = new TextDecoder().decode(binaryData);
                    let obj2 = JSON.parse(jsonString);
                    
                    if(obj2.name == "player"){
                        let player = Players.find(obj => obj.id === obj2.id);
                        if(!player){
                            Players.push(obj2)
                           
                        }
                    }
                  }
                  mainPlayer = Players.find(obj=>obj.id === socket.id)
            break;
            case "updatePlayer":
                if (data instanceof ArrayBuffer) {
                    let jsonString = new TextDecoder().decode(data);
                    let obj2 = JSON.parse(jsonString);
                    
                    let playerIndex = Players.findIndex(obj => obj.id === obj2.id);
            
                    let past =  Players[playerIndex].past;
                    Players[playerIndex] = obj2;
                    Players[playerIndex].past = past;
                  }
            break;
            case "removePlayer":
                let playerIndex = Players.findIndex(obj => obj.id === data);
                Players.splice(playerIndex,1)
            break;
            default:
                  console.log(dataObj.name + " not known.")
       }
      }

   


})













socket.on("synchronizeEveryObject",(objectDataBinary)=>{


    if (objectDataBinary instanceof ArrayBuffer) {
        let binaryData = objectDataBinary;
        let jsonString = new TextDecoder().decode(binaryData);
        let obj2 = JSON.parse(jsonString);

        Players = obj2.Players;
    }
})











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

/*
setInterval(()=>{
    console.log(testdatacount);
    testdatacount = 0;


},1000);
*/







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
                const lightTravelTime = currentTime - timeDelay; 

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

function findVisiblePastBullets(bullets, mainPlayer) {
    let visiblePastObjects = [];

    bullets.forEach(bullet => {

            bullet.past.forEach(pastObject => {
                const distance = Math.sqrt(Math.pow(pastObject.x - mainPlayer.x, 2) + Math.pow(pastObject.y - mainPlayer.y, 2));

                if(distance <= 1200){

                    const timeDelay = calculateTimeDelay(distance);
                    const pastObjectTime = pastObject.time;
                    const currentTime = clientTime;
                    const lightTravelTime = currentTime - timeDelay; 

                    // Check if the past object's time is close to the calculated light travel time
                    if (Math.abs(pastObjectTime - lightTravelTime) <= 2) { 
                        visiblePastObjects.push({
                            bulletId: bullet.id,
                            x: pastObject.x,
                            y: pastObject.y,
                            time: pastObjectTime
                        });
                    }
                }

            });
        
    });

    return visiblePastObjects;
}


setInterval(()=>{

  
    mainPlayer = Players.find(obj=>obj.id === socket.id)
    if(mainPlayer){
    visiblePastObjects = []
    visiblePastBullets = []
     visiblePastObjects = findVisiblePastObjects(Players, mainPlayer);
     visiblePastBullets= findVisiblePastBullets(Bullets, mainPlayer);
    }
   


 },50);




function animate() {
   ctx.fillStyle  = "#222"
   ctx.clearRect(0, 0, canvas.width, canvas.height);
   ctx.fillRect(0, 0, canvas.width, canvas.height);


  
   ctx.shadowBlur = 40;


   ctx.fillStyle  = "white"
   ctx.shadowColor = 'rgba(255,255,255,0.8)';
   ctx.font = 'bold 12px Arial';
  
   ctx.fillText("ping: " + ping, 20, 60);
   
   
        
    if(mainPlayer){
        let player = mainPlayer;
        ctx.fillText("x: " + player.x, 20, 20);
        ctx.fillText("y: " + player.y, 20, 40);

        let centerX = -canvas.width/2+player.x;
        let centerY = -canvas.height/2+player.y

        ctx.beginPath();
        ctx.arc(player.x-centerX, player.y-centerY, 10, 0, 2 * Math.PI); 
        ctx.fillStyle = 'white'; // Set the fill color
        ctx.shadowColor = 'rgba(255,255,255,0.8)';
        ctx.fill(); // Draw the filled circle
        ctx.font = '16px Arial';
        ctx.fillStyle = '#696969';
        ctx.shadowColor = 'rgba(69,69,69,0.8)';
        ctx.fillText(player.playerName, player.x-centerX, player.y - 20-centerY);

        visiblePastObjects.forEach(pos => {
            ctx.beginPath();
            ctx.arc(pos.x-centerX, pos.y-centerY, 10, 0, 2 * Math.PI);
            ctx.fillStyle = 'white'; // Set the fill color
            ctx.shadowColor = 'rgba(255,255,255,0.8)';
            ctx.fill(); // Draw the filled circle
            ctx.font = '16px Arial';
            ctx.fillStyle = '#696969';
            ctx.shadowColor = 'rgba(69,69,69,0.8)';
            ctx.fillText(pos.playerName, pos.x-centerX, pos.y - 20-centerY);


        });

        
       


     
        visiblePastBullets.forEach(pos => {

          const obj = objectPool.acquire();
          obj.update(pos.x-centerX,pos.y-centerY);
          obj.render();
          objectPool.release(obj);

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

  document.addEventListener('click', function(event) {
    // 0 represents the left mouse button
    if (event.button === 0) {

        let player = Players.find(obj=>obj.id === socket.id)
        if(player){
            let centerX = canvas.width/2;
            let centerY = canvas.height/2;

            const mouseX = event.clientX;
            const mouseY = event.clientY;
        
            const dx = mouseX - centerX;
            const dy = mouseY - centerY;

            const angle = Math.atan2(dy, dx);

            let bulletdata = {id:socket.id,angle:angle}
            socket.emit("bullet",bulletdata);
        }
    }
  });


animate();

