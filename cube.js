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
const near = 1;	//plane where near = -z, to denote closest plane from objects
const far = 100;	//plane where far = -z, to denote furthest plane from objects

//ortho() Parameters (near and far reused)
const orthoTop = 5; 	//to be used for left/right/top/bottom

//Cube Variables
var NumVertices  = 36;

const cubeHalfSize = 1;

var points = [];
var colors = [];

const xAxis = 0;
const yAxis = 1;
const zAxis = 2;

var axis = 0;
var rotationSign = 1;	//1 for positive, -1 for negative
var rotationSpeed = 1;
var anglesRotated = 0;
var theta = [0, 0, 0];

//transformation matrices
var _rotationMatrix; 
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
    vec4( 0.5, -0.5, -0.5, 1.0)	//7
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
function Cubie(i, j, k, leftColor, rightColor, upColor, downColor, frontColor, backColor){
	const cubePadding = .1;
	this.i = i;						//ith index cubie from furthest left on x axis
	this.j = j;						//jth index cubie from furthest bottom on y axis
	this.k = k;						//kth index cubie from furthest front on z axis
	this.ownTheta = [0,0,0];		//rotation of cubie about it's origin (likely shouldn't change)
	this.scale = [1,1,1];			//scaling of cubie about it's origin (likely shouldn't change)
	this.rubiksCubeTheta = [0,0,0];	//rotation of cubie about origin of rubik's cube. Used for rotating faces

	this.leftColor = leftColor;		//color of left plane
	this.rightColor = rightColor;	//color of right plane
	this.upColor = upColor;			//...
	this.downColor = downColor;
	this.frontColor = frontColor;
	this.backColor = backColor;		//color of back plane
	

	this.getModelMatrix = function(){
		var translationMatrix = translate(i + Math.sign(i) * cubePadding, j + Math.sign(j) * cubePadding, k + Math.sign(k) * cubePadding);
        var ownRotationMatrix = transpose(mult(rotateX(this.ownTheta[xAxis]), mult(rotateY(this.ownTheta[yAxis]), rotateZ(this.ownTheta[zAxis]))));
        var scaleMatrix = scalem(this.scale[0], this.scale[1], this.scale[2]);
        var cubieModelMatrix = mult(translationMatrix , mult(ownRotationMatrix, scaleMatrix));
        
        var rubiksCubeRotationMatrix = transpose(mult(rotateX(this.rubiksCubeTheta[xAxis]), mult(rotateY(this.rubiksCubeTheta[yAxis]), rotateZ(this.rubiksCubeTheta[zAxis]))));
        var overallModelMatrix = mult(rubiksCubeRotationMatrix, cubieModelMatrix);
        return overallModelMatrix;
	}
}

function RubiksCube(){
	this.cubies = [];
}

var RCube = new RubiksCube();

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

    gl.enable(gl.DEPTH_TEST);

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

    _rotationMatrix = gl.getUniformLocation(program, "rotationMatrix");
    _modelViewMatrix = gl.getUniformLocation(program, "modelViewMatrix");
    _projectionMatrix = gl.getUniformLocation(program, "projectionMatrix");

    eventListenerSetup();

    initCubies();

    render();
}

function initCubies(){
	for(var i = -1; i <= 1; i++){
        for(var j = -1; j <= 1; j++){
            for(var k = -1; k <= 1; k++){
                var newCubie = new Cubie(
                	i, 
                	j, 
                	k, 
                	vertexColors[0], 
                	vertexColors[1], 
                	vertexColors[2],
                	vertexColors[3],
                	vertexColors[4],
                	vertexColors[5]
                );
                RCube.cubies.push(newCubie);
            }
        }
    }
}

function eventListenerSetup(){
    document.getElementById( "pxButton" ).onclick = function () {
        rotateCubeBy(xAxis, 1);
    };
    document.getElementById( "nxButton" ).onclick = function () {
        rotateCubeBy(xAxis, -1);
    };
    document.getElementById( "pyButton" ).onclick = function () {
        rotateCubeBy(yAxis, 1);
    };
    document.getElementById( "nyButton" ).onclick = function () {
        rotateCubeBy(yAxis, -1);
    };
    document.getElementById( "pzButton" ).onclick = function () {
        rotateCubeBy(zAxis, 1);
    };
    document.getElementById( "nzButton" ).onclick = function () {
        rotateCubeBy(zAxis, -1);
    };
    var slider = document.getElementById("slider").onchange = function(event) {
        rotationSpeed = parseInt(event.target.value);
    };
    rotationSpeed = 3;
}

function cubeAligned(){
	var cubeAligned = true;
	theta.forEach(function(element){
		if(element % 90 != 0){
			cubeAligned = false;
		}
	})
	return cubeAligned;
}

function rotateCubeBy(ax, sign){
	console.log(cubeAligned());
	if(cubeAligned()){
		anglesRotated = 0;
		rotationSign = sign;
		if(ax === xAxis || ax === yAxis || ax === zAxis){
			axis = ax;
		}
		else{
			console.log("ERROR: Invalid Axis!");
		}
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

// We need to parition the quad into two triangles in order for
// WebGL to be able to render it.  In this case, we create two
// triangles from the quad indices
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
    anglesRotated += rotationSpeed;
    if(anglesRotated <= 90){
    	theta[axis] += rotationSpeed * rotationSign;
    }
    colorCube();


    var rotationMatrix, modelViewMatrix, projectionMatrix;
    rotationMatrix = transpose(mult(rotateX(theta[xAxis]), mult(rotateY(theta[yAxis]), rotateZ(theta[zAxis]))));
    var viewMatrix = lookAt(eye, at, up);
    //projectionMatrix = perspective(fovy, aspect, near, far);
    projectionMatrix = ortho(-orthoTop, orthoTop, -orthoTop, orthoTop, near, far);

    //set gl projection and rotation matrices, which don't change between cubies yet
    gl.uniformMatrix4fv(_projectionMatrix, false, flatten(projectionMatrix));	//TODO: allow moving closer/further from camera by changing this every render?
    gl.uniformMatrix4fv(_rotationMatrix, false, flatten(rotationMatrix));		

    var i = 0;
    RCube.cubies.forEach(function(cubie){
    	if(i % 2 == 0){
    		cubie.rubiksCubeTheta = theta;
    	}
    	else{
    		cubie.ownTheta = theta;
    	}
		i++;

    	modelViewMatrix = mult(viewMatrix, cubie.getModelMatrix());
        gl.uniformMatrix4fv(_modelViewMatrix, false, flatten(modelViewMatrix));
        gl.drawArrays(gl.TRIANGLES, 0, NumVertices);  

    });

    requestAnimFrame( render );
}
