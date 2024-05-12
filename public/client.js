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
      ctx.fillStyle = 'grey'; // Set the fill color
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
const speedOfLight  = 2;

let isWPressed = false;
let isAPressed = false;
let isSPressed = false;
let isDPressed = false;

let isSpacePressed = false;
let canPressSpace = true;



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

socket.on("syncbullets",(data)=>{
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
      mainPlayer = Players.find(obj=>obj.id === socket.id)
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
   
    if(isSpacePressed){
        console.log(Bullets);
    }


 },50);




function animate() {
   ctx.fillStyle  = "black"
   ctx.clearRect(0, 0, canvas.width, canvas.height);
   ctx.fillRect(0, 0, canvas.width, canvas.height);
  
   ctx.fillStyle  = "white"
   ctx.font = 'bold 12px Arial';
  
   ctx.fillText("ping: " + ping, 20, 60);
   
   
        
    if(mainPlayer){
        let player = mainPlayer;
        ctx.fillText("x: " + player.x, 20, 20);
        ctx.fillText("y: " + player.y, 20, 40);




        ctx.beginPath();
        ctx.arc(player.x, player.y, 10, 0, 2 * Math.PI); // Radius of 20 pixels
        ctx.fillStyle = 'red'; // Set the fill color
        ctx.fill(); // Draw the filled circle
        ctx.font = '16px Arial';
        ctx.fillStyle = 'green';
        ctx.fillText(player.playerName, player.x, player.y - 20);
    

        visiblePastObjects.forEach(pos => {
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 10, 0, 2 * Math.PI);
            ctx.fillStyle = 'red'; // Set the fill color
            ctx.fill(); // Draw the filled circle
            ctx.font = '16px Arial';
            ctx.fillStyle = 'green';
            ctx.fillText(pos.playerName, pos.x, pos.y - 20);


        });

        
       


     
        visiblePastBullets.forEach(pos => {

          const obj = objectPool.acquire();
          obj.update(pos.x,pos.y);
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

    if(event.key === " "){
        isSpacePressed = !isSpacePressed;
        canPressSpace = false;
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

    if(event.key === " "){
        canPressSpace = true;
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
            let centerX = player.x;
            let centerY = player.y;

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

