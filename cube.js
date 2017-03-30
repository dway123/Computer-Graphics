"use strict";

//Program System Variables
var canvas;
var gl;

//ANIMATION SETUP
// ModelViewMatrix Parameters
//lookAt() Parameters
const eye = vec3(-5, -5, 10.0);	//camera location
const at = vec3(0.0, 0.0, 0.0);		//camera faces this location
const up = vec3(0.0, 1.0, 0.0);		//orientation of camera, where up is above the camera

//perspective() Parameters
const fovy = 45.0;	//Field of View Angle in y direction
const aspect = 1.0;	//aspect ratio between x and y
const near = 1;		//plane where near = -z, to denote closest plane from objects
const far = 100;	//plane where far = -z, to denote furthest plane from objects

//ortho() Parameters (near and far reused)
const orthoTop = 5; //to be used for left/right/top/bottom

//Cube Variables
const NumVertices  = 36;

var points = [];
var colors = [];

const xAxis = 0;
const yAxis = 1;
const zAxis = 2;

var rotationAxis = 0;
var rotationSign = 1;	//1 for positive, -1 for negative
var rotationLocation;
var rotationSpeed = 1;
var anglesRotated = 90;

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

//Cubie function! 27 cubies in the rubik's cube
function Cubie(i, j, k){
	const cubePadding = .1;
	this.location = vec4(i, j, k, 1.0);			//ith/jth/kth index cubie from furthest left/bottom/front on x/y/z axis (changes per rotation)
	this.originalLocation = vec3(i, j, k, 1.0);	//original values for i, j, and k in solved rubik's cube
	this.theta = [0,0,0];						//rotation of cubie about origin of rubik's cube. Used for rotating faces
	this.thetaBeforeRotation = [0,0,0];			//TODO: MOVE THIS. thetaBeforeRotation represents theta of rubik's cube cubie before rotation begins. 
												//angles after are determined by thetaBeforeRotation - theta
												//and used to move this.location to new updated points

	// var temp = mat4();

	function rotation(theta){
		return mult(rotateZ(theta[zAxis]), mult(rotateY(theta[yAxis]), rotateX(theta[xAxis])))
	}

	this.getModelMatrix = function(){
		var translationMatrix = translate(i + Math.sign(i) * cubePadding, j + Math.sign(j) * cubePadding, k + Math.sign(k) * cubePadding);        
        var rubiksCubeRotationMatrix = rotation(this.theta);
        //var rubiksCubeRotationMatrix = temp;
        var overallModelMatrix = mult(rubiksCubeRotationMatrix, translationMatrix);
        return overallModelMatrix;
	}


	//stores thetaBeforeRotation to be used for updateLocation after rotation
	this.storePreRotationState = function(){
		this.thetaBeforeRotation = this.theta.slice(0);
	}

	this.updateLocation = function(axis, direction){
		var dTheta = [];
		for(var i = 0; i < this.theta.length; i++){
			dTheta.push(this.theta[i] - this.thetaBeforeRotation[i]);	//NOTE: seems like I have a sign error somewhere (else?), because this does in fact work but theoretically it should be inverted...
		}
		var rotationMatrix = mult(rotateZ(dTheta[zAxis]), mult(rotateY(dTheta[yAxis]), rotateX(dTheta[xAxis])));
		console.log("before: " + this.location);
		this.location = mult(rotationMatrix,this.location);
		for(var i = 0; i < this.location.length; i++){
			this.location[i] = Math.round(this.location[i]);
		}
		console.log("after: " + this.location);
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
    gl.clearColor(1.0, 1.0 , 1.0, 1.0);

    gl.enable(gl.DEPTH_TEST);	//depth visualization
    // gl.enable(gl.CULL_FACE);	//cull faces
    // gl.cullFace(gl.FRONT);

    //
    //  Load shaders and initialize attribute buffers
    //
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

    rCube.initCubies();

    render();
}

function eventListenerSetup(){
	//left/middle/right
	document.getElementById("lButton").onclick = function () {
        rotateCube(xAxis, 1, -1);
    };
    document.getElementById("mButton").onclick = function () {
        rotateCube(xAxis, 1, 0);
    };
    document.getElementById("rButton").onclick = function () {
        rotateCube(xAxis, -1, 1);
    };

    //up/e/down
    document.getElementById("uButton").onclick = function () {
        rotateCube(yAxis, -1, 1);
    };
    document.getElementById("eButton").onclick = function () {
        rotateCube(yAxis, -1, 0);
    };
    document.getElementById("dButton").onclick = function () {
        rotateCube(yAxis, 1, -1);
    };

    //front/slice/back
    document.getElementById("fButton").onclick = function () {
        rotateCube(zAxis, 1, -1);
    };
    document.getElementById("sButton").onclick = function () {
        rotateCube(zAxis, 1, 0);
    };
    document.getElementById("bButton").onclick = function () {
        rotateCube(zAxis, -1, 1);
    };

    //left/middle/right transpose
    document.getElementById("ltButton").onclick = function () {
        rotateCube(xAxis, -1, -1);
    };
    document.getElementById("mtButton").onclick = function () {
        rotateCube(xAxis, -1, 0);
    };
    document.getElementById("rtButton").onclick = function () {
        rotateCube(xAxis, 1, 1);
    };

    //up/e/down
    document.getElementById("utButton").onclick = function () {
        rotateCube(yAxis, 1, 1);
    };
    document.getElementById("etButton").onclick = function () {
        rotateCube(yAxis, 1, 0);
    };
    document.getElementById("dtButton").onclick = function () {
        rotateCube(yAxis, -1, -1);
    };

    //front/slice/back transpose
    document.getElementById("ftButton").onclick = function () {
        rotateCube(zAxis, -1, -1);
    };
    document.getElementById("stButton").onclick = function () {
        rotateCube(zAxis, -1, 0);
    };
    document.getElementById("btButton").onclick = function () {
        rotateCube(zAxis, 1, 1);
    };

    var slider = document.getElementById("slider").onchange = function(event) {
        rotationSpeed = parseInt(event.target.value);
    };
    rotationSpeed = 3;
}

function rotationComplete(){
	return (anglesRotated >= 90);
}

function rotateCube(ax, sign, loc){
	if(rotationComplete()){
		anglesRotated = 0;
		if(ax === xAxis || ax === yAxis || ax === zAxis){
			rotationAxis = ax;
		}
		else{
			alert("ERROR: Invalid Axis! Must be 0, 1, or 2");
		}
		if(rotationSign === 1 || rotationSign === -1){
			rotationSign = sign;
		}
		else{
			alert("ERROR: invalid rotation sign! Must be +1 or -1");
		}
		if(loc === -1 || loc === 0 || loc === 1){
			rotationLocation = loc;
		}
		else{
			alert("ERROR: invalid rotation location! Must be -1, 0, or 1");
		}
		rCube.cubies.forEach(function(cubie){
			cubie.storePreRotationState();
		});
	}
}

function colorCube()
{
    quad( 1, 0, 3, 2 );	//+z front face 	//red
    quad( 2, 3, 7, 6 );	//+x right face 	//yellow
    quad( 3, 0, 4, 7 );	//-y bottom face 	//green
    quad( 4, 5, 6, 7 );	//-z back face 		//blue
    quad( 5, 4, 0, 1 );	//-x left face 		//magenta
    quad( 6, 5, 1, 2 ); //+y top face 		//cyan
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
   if(!rotationComplete()){
    	rCube.cubies.forEach(function(cubie){
    		if(cubie.location[rotationAxis] == rotationLocation){
	    		cubie.theta[rotationAxis] += rotationSpeed * rotationSign;
	    	}
    	})
    }
    if(anglesRotated === 90){//just finished rotation
    	rCube.cubies.forEach(function(cubie){
    		if(cubie.location[rotationAxis] == rotationLocation){
    			cubie.updateLocation();
    		}
    	});
    }
    if(anglesRotated <= 90){
 		anglesRotated += rotationSpeed;
	}
    colorCube();

    var modelViewMatrix, projectionMatrix;
    var viewMatrix = lookAt(eye, at, up);
    //projectionMatrix = perspective(fovy, aspect, near, far);
    projectionMatrix = ortho(-orthoTop, orthoTop, -orthoTop, orthoTop, near, far);

    //set gl projection and rotation matrices, which don't change between cubies yet
    gl.uniformMatrix4fv(_projectionMatrix, false, flatten(projectionMatrix));	//TODO: allow moving closer/further from camera by changing this every render?

    rCube.cubies.forEach(function(cubie){
    	modelViewMatrix = mult(viewMatrix, cubie.getModelMatrix());
        gl.uniformMatrix4fv(_modelViewMatrix, false, flatten(modelViewMatrix));
        gl.drawArrays(gl.TRIANGLES, 0, NumVertices);  
    });

    requestAnimFrame( render );
}
