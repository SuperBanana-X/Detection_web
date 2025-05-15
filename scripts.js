const videoUpload = document.getElementById('videoUpload');
const videoPlayer = document.getElementById('videoPlayer');
const outputCanvas = document.getElementById('outputCanvas');
const startDetectionButton = document.getElementById('startDetection');

const statusMessage = document.getElementById('statusMessage');
const countCarElement = document.getElementById('count-car');
const countPedestrianElement = document.getElementById('count-pedestrian');
const countBicycleElement = document.getElementById('count-bicycle');

const canvasCtx = outputCanvas.getContext('2d');

let animationFrameId = null;
let simulatedObjects = [];

// Start Screen Elements
const startScreen = document.getElementById('startScreen');
const enterAppButton = document.getElementById('enterAppButton');
const mainContainer = document.querySelector('.container');

startDetectionButton.disabled = true;

function setupInitialCanvas() {
    if (outputCanvas.offsetWidth > 0 && outputCanvas.offsetHeight > 0) {
        outputCanvas.width = outputCanvas.offsetWidth;
        outputCanvas.height = outputCanvas.offsetHeight;
    } else {
        const placeholderWidth = mainContainer.querySelector('.video-container').offsetWidth || 720;
        outputCanvas.width = placeholderWidth;
        outputCanvas.height = placeholderWidth * (9/16);
    }
    
    canvasCtx.fillStyle = '#333'; 
    canvasCtx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
    canvasCtx.fillStyle = '#fff';
    canvasCtx.textAlign = 'center';
    canvasCtx.textBaseline = 'middle'; 
    canvasCtx.font = '18px Arial'; 
    canvasCtx.fillText('Please upload video', outputCanvas.width / 2, outputCanvas.height / 2);
}

enterAppButton.addEventListener('click', () => {
    startScreen.style.display = 'none';
    mainContainer.style.display = 'block';
    document.body.classList.add('app-view'); 

    mainContainer.classList.add('active-animations');

    if (!videoPlayer.src) {
        setupInitialCanvas();
    }
    resetCounts(); 
});

videoUpload.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const fileURL = URL.createObjectURL(file);
        videoPlayer.src = fileURL;
        startDetectionButton.disabled = false;
        statusMessage.textContent = 'Video loaded. Click "Start Detection" to begin.';
        
        videoPlayer.onloadedmetadata = () => {
            outputCanvas.width = videoPlayer.videoWidth;
            outputCanvas.height = videoPlayer.videoHeight;
            canvasCtx.drawImage(videoPlayer, 0, 0, outputCanvas.width, outputCanvas.height);
            resetCounts();
        };
    }
});

startDetectionButton.addEventListener('click', () => {
    if (videoPlayer.src) {
        if (videoPlayer.paused || videoPlayer.ended) {
            videoPlayer.play();
        } else {
            videoPlayer.pause();
        }
    } else {
        statusMessage.textContent = 'Please upload a video file first.';
    }
});

videoPlayer.onplay = () => {
    startDetectionButton.textContent = 'Detection Pause';
    statusMessage.textContent = 'Detecting...';
    if (!simulatedObjects.length || videoPlayer.currentTime === 0) {
        initializeSimulatedObjects();
    }
    drawDetections();
};

videoPlayer.onpause = () => {
    if (!videoPlayer.ended) { 
        startDetectionButton.textContent = 'Continue Detection';
        statusMessage.textContent = 'Detection Pause';
    }
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
};

videoPlayer.onended = () => {
    startDetectionButton.textContent = 'Restart Detection';
    statusMessage.textContent = 'Video ended. Please upload a new video.';
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
};

function resetCounts() {
    countCarElement.textContent = '0';
    countPedestrianElement.textContent = '0';
    countBicycleElement.textContent = '0';
}

function initializeSimulatedObjects() {
    simulatedObjects = [];
    if (outputCanvas.width === 0 || outputCanvas.height === 0) {
        if (videoPlayer.videoWidth > 0 && videoPlayer.videoHeight > 0) {
            outputCanvas.width = videoPlayer.videoWidth;
            outputCanvas.height = videoPlayer.videoHeight;
        } else {
            const placeholderWidth = mainContainer.querySelector('.video-container').offsetWidth || 720;
            outputCanvas.width = placeholderWidth;
            outputCanvas.height = placeholderWidth * (9/16);
            console.warn("Canvas dimensions initialized to fallback in initializeSimulatedObjects");
        }
    }

    const objectTypes = [
        { type: 'Vehicle', color: 'rgba(255, 0, 0, 0.8)', widthRatio: 0.12, heightRatio: 0.1 },
        { type: 'Pestria', color: 'rgba(0, 0, 255, 0.8)', widthRatio: 0.03, heightRatio: 0.12 },
        { type: 'Traffic Light', color: 'rgba(0, 200, 0, 0.8)', widthRatio: 0.07, heightRatio: 0.1 }
    ];

    const numObjects = Math.max(3, Math.floor(Math.random() * 4) + 3); 

    for (let i = 0; i < numObjects; i++) { 
        const baseObj = objectTypes[Math.floor(Math.random() * objectTypes.length)];
        const objWidth = baseObj.widthRatio * outputCanvas.width;
        const objHeight = baseObj.heightRatio * outputCanvas.height;

        simulatedObjects.push({
            ...baseObj,
            id: `obj-${Date.now()}-${i}`,
            width: objWidth,
            height: objHeight,
            x: Math.random() * (outputCanvas.width - objWidth),
            y: Math.random() * (outputCanvas.height - objHeight),
            dx: (Math.random() - 0.5) * (outputCanvas.width / 200), 
            dy: (Math.random() - 0.5) * (outputCanvas.height / 200)
        });
    }
    resetCounts();
}

function drawDetections() {
    if (videoPlayer.paused || videoPlayer.ended) {
        return;
    }

    canvasCtx.drawImage(videoPlayer, 0, 0, outputCanvas.width, outputCanvas.height);

    let counts = { 'Vehicle': 0, 'Pestrian': 0, 'Traffic Light': 0 };

    simulatedObjects.forEach(obj => {
        obj.x += obj.dx;
        obj.y += obj.dy;

        if (obj.x <= 0 || obj.x + obj.width >= outputCanvas.width) {
            obj.dx *= -1;
            obj.x = Math.max(0, Math.min(obj.x, outputCanvas.width - obj.width)); 
        }
        if (obj.y <= 0 || obj.y + obj.height >= outputCanvas.height) {
            obj.dy *= -1;
            obj.y = Math.max(0, Math.min(obj.y, outputCanvas.height - obj.height)); 
        }

        canvasCtx.strokeStyle = obj.color;
        canvasCtx.lineWidth = Math.max(1, Math.min(2, outputCanvas.width / 300)); 
        canvasCtx.strokeRect(obj.x, obj.y, obj.width, obj.height);

        const fontSize = Math.max(10, Math.min(16, outputCanvas.width / 40)); 
        canvasCtx.fillStyle = obj.color;
        canvasCtx.font = `bold ${fontSize}px Arial`;
        canvasCtx.textBaseline = 'bottom';
        const textX = obj.x + 2;
        const textY = obj.y > fontSize + 2 ? obj.y - 2 : obj.y + obj.height + fontSize + 2;
        
        const textWidth = canvasCtx.measureText(obj.type).width;
        canvasCtx.fillStyle = 'rgba(0,0,0,0.5)';
        canvasCtx.fillRect(textX - 2, textY - fontSize -2 , textWidth + 4, fontSize + 4);
        canvasCtx.fillStyle = obj.color;
        canvasCtx.fillText(obj.type, textX, textY);
    
        if (counts[obj.type] !== undefined) {
            counts[obj.type]++;
        }
    });

    countCarElement.textContent = counts['Vehicle'];
    countPedestrianElement.textContent = counts['Pestrian'];
    countBicycleElement.textContent = counts['Traffic Light'];
    
    if (statusMessage.textContent !== 'Detection Pause' && !videoPlayer.ended) {
         statusMessage.textContent = 'Detecting';
    }

    animationFrameId = requestAnimationFrame(drawDetections);
}

document.addEventListener('DOMContentLoaded', () => {
    // The page starts with the startScreen.
    // Initial canvas setup and count reset will happen after user clicks "Enter System".
});