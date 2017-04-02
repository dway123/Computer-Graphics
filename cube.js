"use strict";

//Program System Variables
var canvas;
var gl;

//ortho() Parameters(near and far reused)
const orthoTop = 3; //to be used for left/right/top/bottom
const near = 0;		//plane where near = -z, to denote closest plane from objects
const far = 100;	//plane where far = -z, to denote furthest plane from objects

//Cube Variables
const NumVertices  = 36;

var points = [];
var colors = [];

const xAxis = 0;
const yAxis = 1;
const zAxis = 2;

//transformation matrices
var _modelViewMatrix;
var _projectionMatrix;

const baseCubeVertices = [			//these vertices define unit cube, from which all other cubes are generated
    vec4(-0.5, -0.5,  0.5, 1.0),	//0
    vec4(-0.5,  0.5,  0.5, 1.0),	//1
    vec4( 0.5,  0.5,  0.5, 1.0),	//2
    vec4( 0.5, -0.5,  0.5, 1.0),	//3
    vec4(-0.5, -0.5, -0.5, 1.0),	//4
    vec4(-0.5,  0.5, -0.5, 1.0),	//5
    vec4( 0.5,  0.5, -0.5, 1.0),	//6
    vec4( 0.5, -0.5, -0.5, 1.0)		//7
];

const vertexColors = [
    [34/255, 139/255,  34/255,  1.0], // green
    [215/255, 215/255, 0/255,   1.0], // yellow
    [255/255, 0/255,   0/255,   1.0], // red
    [0/255,   0/255,   205/255, 1.0], // blue
    [255/255, 255/255, 255/255, 1.0], // white
    [255/255, 102/255, 0/255,   1.0]  // orange
];

//objects
var camera = new Camera();

//Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

//Cubie function! 27 cubies in the rubik's cube
function Cubie(i, j, k){
	const cubePadding = .1;
	this.location = vec4(i, j, k, 1.0);				//ith/jth/kth index cubie from furthest left/bottom/front on x/y/z axis (changes per rotation)
	const originalLocation = vec3(i, j, k, 1.0);	//original values for i, j, and k in solved rubik's cube
	this.theta = [0,0,0];							//rotation of cubie about origin of rubik's cube. Used for rotating faces
	var previousRotationMatrix = mat4();

	function getRotationMatrix(theta){
		return mult(rotateZ(theta[zAxis]), mult(rotateY(theta[yAxis]), rotateX(theta[xAxis])))
	}

	this.getModelMatrix = function(){
		var translationMatrix = translate(i + Math.sign(i) * cubePadding, j + Math.sign(j) * cubePadding, k + Math.sign(k) * cubePadding);        
        var rotationMatrix = mult(getRotationMatrix(this.theta), previousRotationMatrix);
        var overallModelMatrix = mult(rotationMatrix, translationMatrix);
        return overallModelMatrix;
	}

	//post rotation update location for future rotations, and store all previous rotation matrices' results
	this.updateLocation = function(){
		var rotationMatrix = getRotationMatrix(this.theta);

		previousRotationMatrix = mult(rotationMatrix, previousRotationMatrix);
		this.location = mult(rotationMatrix,this.location);

		for(var i = 0; i < this.location.length; i++){
			this.location[i] = Math.round(this.location[i]);
		}
		this.theta = [0,0,0];
	}
}

function RubiksCube(){
	this.cubies = [];

	this.initCubies = function(){
		for(var i = -1; i <= 1; i++){
	        for(var j = -1; j <= 1; j++){
	            for(var k = -1; k <= 1; k++){
	                var newCubie = new Cubie(i, j, k);
	                this.cubies.push(newCubie);
	            }
	        }
	    }
	}
}

var rCube = new RubiksCube();

function Rotation(){
	var axis;				//axis which the current rotation is about (0, 1, or 2)/(xaxis,yaxis, or zaxis)
	var sign = 1;			//1 for positive, -1 for negative, determines whether it goes clockwise/counterclockwise
	var plane;				//which plane to rotate
	var anglesRotated = 90;	//how much of the rotation is complete. It is complete at >= 90, starts at 0
	var speed = 10;			//how many angles to rotate per iteration

	var rotationQueue = [];
	var completedRotations = [];

	function isRotating(){
		return (anglesRotated - speed < 90);
	}

	function cleanUpCubies(){
		rCube.cubies.forEach(function(cubie){
			if(cubie.location[axis] == plane){
				cubie.updateLocation();
			}
		});
	}

	this.setspeed = function(newSpeed){
		speed = newSpeed;
	}

	this.randomRotation = function(){
		var axis = getRandomInt(xAxis,zAxis);
		var sign = getRandomInt(0,1);
		if(sign === 0){sign = -1;}
		var plane = getRandomInt(-1,1)
		this.queueRotation(axis, sign, plane);
	}

	this.randomRotations = function(n){
		if(rotationQueue.length + n > 9000){
			alert("Wow! There would be over 9000 rotations! We couldn't possibly make you wait for so long :o. Please try again or with a smaller amount of rotations"); return;
		}
		if(!(parseInt(n) > 0)){
			alert("Please select a positive nonzero integer! Thanks!"); return;
		}
		for(var i = 0; i < n; i++){
			this.randomRotation();
		}
	}

	this.queueRotation = function(ax,s,p){
		if(ax !== xAxis && ax !== yAxis && ax !== zAxis){
			alert("ERROR: Invalid Axis! Must be 0, 1, or 2");
		}
		if(s !== 1 && s !== -1){
			alert("ERROR: invalid rotation sign! Must be +1 or -1");
		}
		if(p !== -1 && p !== 0 && p !== 1){
			alert("ERROR: invalid rotation location! Must be -1, 0, or 1");
		}
		if(rotationQueue.length > 9000){
			alert("Wow! There's over 9000 rotations waiting in the queue. Please wait before submitting more rotations. Thanks!"); return;
		}
		var rotation = [ax,s,p];
		rotationQueue.push(rotation);

		this.beginNextRotation();
	}

	this.beginNextRotation = function(){
		if(rotationQueue.length === 0){return;}	//no rotations available
		if(isRotating()){return;}//don't begin next rotation until current one completes

		anglesRotated = 0;
		var nextRotation = rotationQueue.shift();

		axis = nextRotation[0];
		sign = nextRotation[1];
		plane = nextRotation[2];
		console.log(rotationQueue.length + " rotations remaining. Began: " + nextRotation);
	}

	this.try = function(){
		anglesRotated += speed;
		if(isRotating()){
			rCube.cubies.forEach(function(cubie){
				if(cubie.location[axis] == plane){
		    		cubie.theta[axis] = cubie.theta[axis] + speed * sign;
		    		if(cubie.theta[axis] > 90){
		    			cubie.theta[axis] = 90;
		    		}
		    		if(cubie.theta[axis] < -90){
		    			cubie.theta[axis] = -90;
		    		}
		    	}
			});
		}
		if(anglesRotated >= 90 && anglesRotated < 90 + speed * 2){
			cleanUpCubies();
			this.beginNextRotation();
		}
	}
}

var rotation = new Rotation();

window.onload = function init()
{
	//canvas setup
    canvas = document.getElementById( "gl-canvas" );
	//canvas.width = Math.min(window.innerHeight, window.innerWidth) - 60;	//canvas.width adjusted to match size window, while keeping the canvas square
	//canvas.height = Math.min(window.innerHeight, window.innerWidth) - 60;	//padding of 60 px given for buttons to display within window

	//webGL setup
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    colorCube();

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(200/255, 200/255 , 200/255, 1.0);

    gl.enable(gl.DEPTH_TEST);	//depth visualization
    // gl.enable(gl.CULL_FACE);	//cull faces
    // gl.cullFace(gl.FRONT);

    //  Load shaders and initialize attribute buffers
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram(program);

    var cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

    var vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    _modelViewMatrix = gl.getUniformLocation(program, "modelViewMatrix");
    _projectionMatrix = gl.getUniformLocation(program, "projectionMatrix");

    eventListenerSetup();
    camera.init(canvas);

    rCube.initCubies();

    render();
}

var shiftKeyPressed = false;
function keyDownHandler(e){
	function mapShiftToDirection(){
		if(shiftKeyPressed){return -1;}
		return 1;
	}
	if(e.keyCode == 16){
		shiftKeyPressed = true;
	}

	if(e.keyCode == 81){	//q maps to L, shift + q maps to L'
		rotation.queueRotation(xAxis, 1 * mapShiftToDirection(), -1);
	}
	else if(e.keyCode == 87){//w maps to M, shift + w maps to M'
		rotation.queueRotation(xAxis, 1 * mapShiftToDirection(), 0);
	}
	else if(e.keyCode == 69){//e maps to R, shift + e maps to R'
		rotation.queueRotation(xAxis, -1 * mapShiftToDirection(), 1);
	}

	if(e.keyCode == 65){	//a maps to U, shift + a maps to U'
		rotation.queueRotation(yAxis, -1 * mapShiftToDirection(), 1);
	}
	else if(e.keyCode == 83){//s maps to E, shift + s maps to E'
		rotation.queueRotation(yAxis, -1 * mapShiftToDirection(), 0);
	}
	else if(e.keyCode == 68){//d maps to D, shift + d maps to D'
		rotation.queueRotation(yAxis, 1 * mapShiftToDirection(), -1);
	}

	if(e.keyCode == 90){	//z maps to F, shift + z maps to F'
		rotation.queueRotation(zAxis, 1 * mapShiftToDirection(), -1);
	}
	else if(e.keyCode == 88){//x maps to S, shift + x maps t S'
		rotation.queueRotation(zAxis, 1 * mapShiftToDirection(), 0);
	}
	else if(e.keyCode == 67){//c maps to B, shift + c maps to B'
		rotation.queueRotation(zAxis, -1 * mapShiftToDirection(), 1);
	}
}

function keyUpHandler(e){
	if(e.keyCode == 16){
		shiftKeyPressed = false;
	}
}

function eventListenerSetup(){
	//left/middle/right
	document.getElementById("lButton").onclick = function () {
        rotation.queueRotation(xAxis, 1, -1);
    };
    document.getElementById("mButton").onclick = function () {
        rotation.queueRotation(xAxis, 1, 0);
    };
    document.getElementById("rButton").onclick = function () {
        rotation.queueRotation(xAxis, -1, 1);
    };

    //up/e/down
    document.getElementById("uButton").onclick = function () {
        rotation.queueRotation(yAxis, -1, 1);
    };
    document.getElementById("eButton").onclick = function () {
        rotation.queueRotation(yAxis, -1, 0);
    };
    document.getElementById("dButton").onclick = function () {
        rotation.queueRotation(yAxis, 1, -1);
    };

    //front/slice/back
    document.getElementById("fButton").onclick = function () {
        rotation.queueRotation(zAxis, 1, -1);
    };
    document.getElementById("sButton").onclick = function () {
        rotation.queueRotation(zAxis, 1, 0);
    };
    document.getElementById("bButton").onclick = function () {
        rotation.queueRotation(zAxis, -1, 1);
    };

    //left/middle/right transpose
    document.getElementById("ltButton").onclick = function () {
        rotation.queueRotation(xAxis, -1, -1);
    };
    document.getElementById("mtButton").onclick = function () {
        rotation.queueRotation(xAxis, -1, 0);
    };
    document.getElementById("rtButton").onclick = function () {
        rotation.queueRotation(xAxis, 1, 1);
    };

    //up/e/down
    document.getElementById("utButton").onclick = function () {
        rotation.queueRotation(yAxis, 1, 1);
    };
    document.getElementById("etButton").onclick = function () {
        rotation.queueRotation(yAxis, 1, 0);
    };
    document.getElementById("dtButton").onclick = function () {
        rotation.queueRotation(yAxis, -1, -1);
    };

    //front/slice/back transpose
    document.getElementById("ftButton").onclick = function () {
        rotation.queueRotation(zAxis, -1, -1);
    };
    document.getElementById("stButton").onclick = function () {
        rotation.queueRotation(zAxis, -1, 0);
    };
    document.getElementById("btButton").onclick = function () {
        rotation.queueRotation(zAxis, 1, 1);
    };

    document.getElementById("randomMoveButton").onclick = function () {
        var randomMoveAmount = document.getElementById("randomMoveAmount").value;
        rotation.randomRotations(parseInt(randomMoveAmount));
    };

    var slider = document.getElementById("slider").onchange = function(event) {
        rotation.setspeed(parseInt(event.target.value));
    };

    document.addEventListener("keydown", keyDownHandler, false);
    document.addEventListener("keyup", keyUpHandler, false);
}

function Camera(){
	//lookAt() Parameters
	const eye = vec3(0, 0, 10);	//camera location as a vec4, for mouse rotation
	const at = vec3(0.0, 0.0, 0.0);		//camera faces this location
	const up = vec3(0.0, 1.0, 0.0);		//orientation of camera, where up is above the camera

	var trackingMouse = false;
	var oldX, oldY;
	var theta = [20,-20,0];

	this.init = function(cvs){
		cvs.addEventListener("mousedown", beginTrackingMouse, false);
		cvs.addEventListener("mouseup", stopTrackingMouse, false);
		cvs.addEventListener("mouseout", stopTrackingMouse, false);
		cvs.addEventListener("mousemove", mouseMove, false);
	}

	this.getTheta = function(){
		return theta;
	}

	function beginTrackingMouse(e){
		trackingMouse = true;
		oldX = e.pageX;
		oldY = e.pageY;
		e.preventDefault();	//Prevents being highlighted when double-clicked on desktop, scrolling on mobile
	}

	function stopTrackingMouse(e){
		trackingMouse = false;
	}

	function mouseMove(e){
		if(!trackingMouse){return;}

		var dx = e.pageX - oldX;
		var dy = e.pageY - oldY;

		setCameraAngle(180 * dx/canvas.width, 180 * dy/canvas.height);
		oldX = e.pageX;
		oldY = e.pageY;
	}

	function setCameraAngle(dx, dy){
		var dir = [-1, -1];
		if(theta[0] > 90 && theta[0] < 270){
			dir[1] = 1;
		}

		theta[0] = (theta[0] - (dir[0] * dy)) % 360;	//rotate about x axis to have y move
		theta[1] = (theta[1] - (dir[1] * dx)) % 360;	//rotate about y axis to have x move
	}

	this.getViewMatrix = function(){
	    var rotationMatrix = mult(rotateX(theta[0]), rotateY(theta[1]));	//to move camera to view of camera
	    return mult(lookAt(eye, at, up), rotationMatrix);
	}	
}

function colorCube()
{
    quad(1, 0, 3, 2);	//+z front face 	//red
    quad(2, 3, 7, 6);	//+x right face 	//yellow
    quad(3, 0, 4, 7);	//-y bottom face 	//green
    quad(4, 5, 6, 7);	//-z back face 		//blue
    quad(5, 4, 0, 1);	//-x left face 		//magenta
    quad(6, 5, 1, 2); 	//+y top face 		//cyan
}

// Parition quad into two triangles from quad indices
function quad(a, b, c, d)
{
    //vertex color assigned by the index of the vertex
    var indices = [ a, b, c, a, c, d ];
    for (var i = 0; i < indices.length; ++i) {
        points.push(baseCubeVertices[indices[i]]);
        // for solid colored faces use
        colors.push(vertexColors[a - 1]);
    }
}

function render()
{
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    //during rotation, rotate all relevant cubies, as noted by their location 
   	rotation.try();
    colorCube();

    var modelViewMatrix, projectionMatrix;

    var viewMatrix = camera.getViewMatrix();
    projectionMatrix = ortho(-orthoTop, orthoTop, -orthoTop, orthoTop, near, far);
    gl.uniformMatrix4fv(_projectionMatrix, false, flatten(projectionMatrix));

    rCube.cubies.forEach(function(cubie){
    	modelViewMatrix = mult(viewMatrix, cubie.getModelMatrix());
        gl.uniformMatrix4fv(_modelViewMatrix, false, flatten(modelViewMatrix));
        gl.drawArrays(gl.TRIANGLES, 0, NumVertices);  
    });

    requestAnimFrame(render);
}
