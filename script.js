const canvas = document.getElementById('canvas1');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const particleArray = [];
let hue = 0;

window.addEventListener('resize', function(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
})

const mouse = {
  x: undefined,
  y: undefined,
}

canvas.addEventListener('click', function(event){
  mouse.x = event.x;
  mouse.y = event.y;
  for(let i = 0; i<10;i++){
  particleArray.push(new Particle());
  }
})

canvas.addEventListener('mousemove', function(event){
  mouse.x = event.x;
  mouse.y = event.y;
  for(let i = 0; i<2;i++){
  particleArray.push(new Particle());
  }
})

class Particle {
  constructor(){
    //this.x = Math.random()*canvas.width;
    //this.y = Math.random()*canvas.height;
    this.x = mouse.x;
    this.y = mouse.y;
    this.size = Math.random()*15+1;
    this.speedX = Math.random() * 3 - 1.5;
    this.speedY = Math.random() * 3 - 1.5;
    this.color = 'hsl(' + hue + ', 100%, 50%)';
  }
  update(){
    this.x += this.speedX;
    this.y += this.speedY;
    if (this.size > 0.2) this.size -= 0.1;
  }
  draw(){
    ctx.fillStyle = this.color;
    //ctx.strokeStyle = 'red';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(this.x, this.y,this.size,0,Math.PI * 2);
    //ctx.stroke();
    ctx.fill();
  }
}


console.log(particleArray);

function handleParticles(){
  for (let i = 0; i<particleArray.length;i++){
    particleArray[i].update();
    particleArray[i].draw();
    for(let j = i; j < particleArray.length; j++){
      const dx = particleArray[i].x - particleArray[j].x;
      const dy = particleArray[i].y - particleArray[j].y;
      const distamce = Math.sqrt(dx*dx+dy*dy);
      if (distamce < 100){
        ctx.beginPath();
        ctx.strokeStyle = particleArray[i].color;
        //ctx.lineWidth = particleArray[i].size/10;
        ctx.lineWidth = 0.2;
        ctx.moveTo(particleArray[i].x, particleArray[i].y);
        ctx.lineTo(particleArray[j].x, particleArray[j].y);
        ctx.stroke();
        ctx.closePath();
      }
    }
    if (particleArray[i].size <= 0.3){
      particleArray.splice(i,1);
      i--;
      console.log(particleArray.length);
    }
  }
}

function animate(){
  ctx.clearRect(0,0, canvas.width, canvas.height);
  //ctx.fillStyle = 'rgba(0,0,0,0.02)';
  //ctx.fillRect(0,0,canvas.width, canvas.height);
  handleParticles();
  hue+=2;
  requestAnimationFrame(animate);
}

animate();
