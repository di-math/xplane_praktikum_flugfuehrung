// ref_a has to always be NW to ref_b
const ref_a = [0, 0, 11.333333, 48.866667]
const ref_b = [685, 684, 11.733333, 48.6]

let curr_lat = 0.0;
let curr_lon = 0.0;
let curr_heading = 0.0;

function preload() {
  // Load map as background (0, 0, 11.333333, 48.866667), (685, 684, 11.733333, 48.6)
  // etsi_vfr1 reference points: 
  map_background = loadImage('assets/etsi_vfr1.png');
  
  // Load airplane image
  airplane_img = loadImage('assets/airplane.png');
}

function setup() {
  // Check if ref_a is NW to ref_b
  if(ref_a[2] > ref_b[2] || ref_a[3] < ref_b[3]) {
    // TODO: show error message in a better way
    console.log("Error, ref_a point is not NW to ref_a point!");
    return; 
  }
  
  // Create canvas at the size of the map background
  createCanvas(map_background.width, map_background.height);
  
  // Setup websocket
  const socket = new WebSocket('ws://localhost:3000');
  // Listen for messages
  socket.onmessage = (message) => {
    pos_obj = JSON.parse(message.data);
    curr_lat = pos_obj["lat"];
    curr_lon = pos_obj["lon"];
    curr_heading = pos_obj["heading"];
  };
  
}


function draw() {
  // Draw the map as background
  image(map_background, 0, 0);
  
  // Draw plane on map
  coord = get_pixels_from_geo_coordinates(curr_lat, curr_lon);
  draw_plane(coord[0], coord[1], curr_heading);
}


function draw_plane(x, y, heading) {
  push()
  airplane_img.resize(50, 0);
  imageMode(CENTER);
  translate(x, y)
  angleMode(DEGREES);
  rotate(heading);
  image(airplane_img, 0, 0)
  pop()
}


function get_pixels_from_geo_coordinates(lat, lon) {
  x = map(lat, ref_a[2], ref_b[2], ref_a[0], ref_b[0]);
  y = map(lon, ref_a[3], ref_b[3], ref_a[1], ref_b[1]);
  return [x, y]
}
