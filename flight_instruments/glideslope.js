let curr_lat = 0.0;
let curr_lon = 0.0;
let curr_heading = 0.0;
let curr_height = 0.0;
let curr_aoa = 0.0;
let flight_path_history = [];

// WGS84 constants
const semi_major_axis = 6378137.0;
const semi_minor_axis = 6356752.314245;
const eccentricity = 1 - semi_minor_axis ** 2 / semi_major_axis ** 2;

// Define canvas
let canvas_size_x = 800;
let canvas_size_y = 400;
// ref_a is the lower left reference point of the glideslope
let gs_ref_a_x_px = 10;
let gs_ref_a_y_px = canvas_size_y - 10;
let gs_ref_a_lat_geo = 48.714378;
let gs_ref_a_lon_geo = 11.555789;
let gs_ref_a_h_ft_geo = 1203 / 3.28084;
let { x: gs_ref_a_x_ecef, y: gs_ref_a_y_ecef, z: gs_ref_a_z_ecef } = lat_lon_to_ecef(gs_ref_a_lat_geo, gs_ref_a_lon_geo, gs_ref_a_h_ft_geo);
// ref_b is the upper right reference point of the glideslope
let gs_ref_b_x_px = canvas_size_x - 100;
let gs_ref_b_y_px = 100;
let gs_ref_b_lat_geo = 48.745781;
let gs_ref_b_lon_geo = 11.675081;
let gs_ref_b_h_ft_geo = 2900 / 3.28084;
let { x: gs_ref_b_x_ecef, y: gs_ref_b_y_ecef, z: gs_ref_b_z_ecef } = lat_lon_to_ecef(gs_ref_b_lat_geo, gs_ref_b_lon_geo, gs_ref_a_h_ft_geo);

let ground_dist_ab = Math.sqrt((gs_ref_b_x_ecef - gs_ref_a_x_ecef) ** 2 + (gs_ref_b_y_ecef - gs_ref_a_y_ecef) ** 2);

function preload() {
  // Load airplane image
  airplane_img = loadImage("assets/cessna172_side_shadow.png");
}

function setup() {
  createCanvas(canvas_size_x, canvas_size_y);
  frameRate(2);

  // Setup websocket
  const socket = new WebSocket("ws://localhost:8080");
  // Listen for messages
  socket.onmessage = (message) => {
    pos_obj = JSON.parse(message.data);
    curr_lat = pos_obj["lat"];
    curr_lon = pos_obj["lon"];
    curr_heading = pos_obj["heading"];
    curr_height = pos_obj["height"];
    curr_aoa = pos_obj["aoa"];
  };
}

function draw() {
  // Draw Glideslope
  background(43, 49, 59);
  stroke(180);
  strokeWeight(2);
  line(gs_ref_a_x_px, gs_ref_a_y_px, gs_ref_b_x_px, gs_ref_b_y_px);
  line(gs_ref_b_x_px, gs_ref_b_y_px, canvas_size_x, gs_ref_b_y_px);

  // Calculate current position in pixels
  coord = get_pixels_from_geo_coordinates(curr_lat, curr_lon, curr_height);

  // Draw path
  stroke(3, 138, 21);
  flight_path_history.push(coord);
  flight_path_history.forEach((elem) => {
    circle(elem[0], elem[1], 2);
  });
  if (flight_path_history.length > 500) {
    flight_path_history.shift();
  }

  // Draw plane
  draw_plane(coord[0], coord[1], curr_aoa);
}

function draw_plane(x, y, aoa) {
  push();
  airplane_img.resize(40, 0);
  imageMode(CENTER);
  translate(x, y);
  angleMode(DEGREES);
  rotate(aoa);
  image(airplane_img, 0, 0);
  pop();
}

function get_pixels_from_geo_coordinates(lat, lon, height) {
  let { x: x_ecef, y: y_ecef, z: z_ecef } = lat_lon_to_ecef(lat, lon, gs_ref_a_h_ft_geo);
  let ground_dist_pb = Math.sqrt((x_ecef - gs_ref_a_x_ecef) ** 2 + (y_ecef - gs_ref_a_y_ecef) ** 2);
  console.log(x_ecef, y_ecef, z_ecef);
  x = map(ground_dist_pb, 0, ground_dist_ab, gs_ref_a_x_px, gs_ref_b_x_px);
  y = map(height, gs_ref_a_h_ft_geo, gs_ref_b_h_ft_geo, gs_ref_a_y_px, gs_ref_b_y_px);
  return [x, y];
}

function lat_lon_to_ecef(lat, lon, h) {
  // convert to rad
  lat = lat * (Math.PI / 180);
  lon = lon * (Math.PI / 180);
  let N = semi_major_axis / Math.sqrt(1 - eccentricity * Math.sin(lat) ** 2);

  let x = (N + h) * Math.cos(lat) * Math.cos(lon);
  let y = (N + h) * Math.cos(lat) * Math.sin(lon);
  let z = (N * (1 - eccentricity) + h) * Math.sin(lat);
  return { x, y, z };
}
