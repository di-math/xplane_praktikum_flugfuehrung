let curr_lat = 0.0;
let curr_lon = 0.0;
let curr_heading = 0.0;
let curr_height = 0.0;
let curr_aoa = 0.0;

// WGS84 constants
const semi_major_axis = 6378137.0;
const semi_minor_axis = 6356752.314245;
const eccentricity = 1 - semi_minor_axis ** 2 / semi_major_axis ** 2;

const rwy_25L = {
  start_lat: 48.714378,
  start_lon: 11.555789,
  end_lat: 48.704578,
  end_lon: 11.518683,
  elev: 1203 
};

const {x: rwy_25L_start_x, y: rwy_25L_start_y, z: rwy_25L_start_z} = lat_lon_to_ecef(rwy_25L.start_lat, rwy_25L.start_lon, rwy_25L.elev/3.281)
const {x: rwy_25L_end_x, y: rwy_25L_end_y, z: rwy_25L_end_z} = lat_lon_to_ecef(rwy_25L.end_lat, rwy_25L.end_lon, rwy_25L.elev/3.281)

// Define canvas
let canvas_size_x = 800;
let canvas_size_y = 800;
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

function setup() {
  createCanvas(canvas_size_x, canvas_size_y);
  frameRate(30);

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

  let {x: airplane_x, y: airplane_y, z: airplane_z} = lat_lon_to_ecef(curr_lat, curr_lon, rwy_25L.elev/3.281); 
  let vec_airplane_rwy25L = {x: (rwy_25L_start_x-airplane_x), y: rwy_25L_start_y-airplane_y, z: (rwy_25L_start_z-airplane_z)}
  let dist_airplane_rwy25L = Math.sqrt(vec_airplane_rwy25L.x**2 + vec_airplane_rwy25L.y**2 + vec_airplane_rwy25L.z**2)
  // calculate beta (localizer deviation)
  let vec_RWY25Lstart_RWY25Lend = {x: rwy_25L_end_x-rwy_25L_start_x, y: rwy_25L_end_y-rwy_25L_start_y, z: rwy_25L_end_z-rwy_25L_start_z}
  let prod_vec_RWY25Lstart_RWY25Lend_vec_airplane_rwy25L = (vec_airplane_rwy25L.x*vec_RWY25Lstart_RWY25Lend.x+vec_airplane_rwy25L.y*vec_RWY25Lstart_RWY25Lend.y+vec_airplane_rwy25L.z*vec_RWY25Lstart_RWY25Lend.z)
  let scale = 0.5; // to prevent precision errors
  let cross_prod_vec_RWY25Lstart_RWY25Lend_vec_airplane_rwy25L = {
    x: (vec_airplane_rwy25L.y * scale * vec_RWY25Lstart_RWY25Lend.z - vec_airplane_rwy25L.z * vec_RWY25Lstart_RWY25Lend.y),
    y: (vec_airplane_rwy25L.z * scale * vec_RWY25Lstart_RWY25Lend.x - vec_airplane_rwy25L.x * vec_RWY25Lstart_RWY25Lend.z),
    z: (vec_airplane_rwy25L.x * scale * vec_RWY25Lstart_RWY25Lend.y - vec_airplane_rwy25L.y * vec_RWY25Lstart_RWY25Lend.x)
  }
  let prod_cross_prod_vec_RWY25Lstart_RWY25Lend_vec_airplane_rwy25L_vec_airplane_rwy25L = (cross_prod_vec_RWY25Lstart_RWY25Lend_vec_airplane_rwy25L.x * vec_airplane_rwy25L.x + cross_prod_vec_RWY25Lstart_RWY25Lend_vec_airplane_rwy25L.y * vec_airplane_rwy25L.y + cross_prod_vec_RWY25Lstart_RWY25Lend_vec_airplane_rwy25L.z * vec_airplane_rwy25L.z);
  let beta_sign = Math.sign(prod_cross_prod_vec_RWY25Lstart_RWY25Lend_vec_airplane_rwy25L_vec_airplane_rwy25L)
  let beta = beta_sign * Math.acos(prod_vec_RWY25Lstart_RWY25Lend_vec_airplane_rwy25L / (dist_airplane_rwy25L * Math.sqrt(vec_RWY25Lstart_RWY25Lend.x**2 + vec_RWY25Lstart_RWY25Lend.y**2 + vec_RWY25Lstart_RWY25Lend.z**2))) * (180/Math.PI);
  // calculate alpha (glideslope deviation)
  let alpha = Math.atan((curr_height-(rwy_25L.elev/3.281)) / (dist_airplane_rwy25L + 350)) * (180/Math.PI);
  draw_approach_instrument(alpha - 3, beta);
  
}

function draw_approach_instrument(alpha_deviation, beta_deviation) {
  alpha_deviation = Math.min(Math.max(alpha_deviation, -0.72), 0.72) * -1;
  beta_deviation = Math.min(Math.max(beta_deviation, -2.5), 2.5);
  let padding = 5;
  let number_of_points = 12;
  let y_deviation = (alpha_deviation * (canvas_size_y/2-(canvas_size_y)/number_of_points)) / 0.72;
  let x_deviation = (beta_deviation * (canvas_size_x/2-(canvas_size_x)/number_of_points)) / 2.5;
  let line_width_x = canvas_size_x - 100 - Math.abs(x_deviation);
  let line_width_y = canvas_size_y - 100 - Math.abs(y_deviation);
  push();
  noFill();
  stroke(180);
  strokeWeight(2);
  circle(canvas_size_x/2, canvas_size_y/2, canvas_size_y-padding);
  fill(180);
  circle(canvas_size_x/2, ((canvas_size_y)/number_of_points)*1, canvas_size_y/90);
  circle(canvas_size_x/2, ((canvas_size_y)/number_of_points)*2, canvas_size_y/90);
  circle(canvas_size_x/2, ((canvas_size_y)/number_of_points)*3, canvas_size_y/90);
  circle(canvas_size_x/2, ((canvas_size_y)/number_of_points)*4, canvas_size_y/90);
  circle(canvas_size_x/2, ((canvas_size_y)/number_of_points)*5, canvas_size_y/90);
  circle(canvas_size_x/2, ((canvas_size_y)/number_of_points)*6, canvas_size_y/90);
  circle(canvas_size_x/2, ((canvas_size_y)/number_of_points)*7, canvas_size_y/90);
  circle(canvas_size_x/2, ((canvas_size_y)/number_of_points)*8, canvas_size_y/90);
  circle(canvas_size_x/2, ((canvas_size_y)/number_of_points)*9, canvas_size_y/90);
  circle(canvas_size_x/2, ((canvas_size_y)/number_of_points)*10, canvas_size_y/90);
  circle(canvas_size_x/2, ((canvas_size_y)/number_of_points)*11, canvas_size_y/90);
  circle(((canvas_size_x)/number_of_points)*1, canvas_size_y/2, canvas_size_y/90);
  circle(((canvas_size_x)/number_of_points)*2, canvas_size_y/2, canvas_size_y/90);
  circle(((canvas_size_x)/number_of_points)*3, canvas_size_y/2, canvas_size_y/90);
  circle(((canvas_size_x)/number_of_points)*4, canvas_size_y/2, canvas_size_y/90);
  circle(((canvas_size_x)/number_of_points)*5, canvas_size_y/2, canvas_size_y/90);
  circle(((canvas_size_x)/number_of_points)*6, canvas_size_y/2, canvas_size_y/90);
  circle(((canvas_size_x)/number_of_points)*7, canvas_size_y/2, canvas_size_y/90);
  circle(((canvas_size_x)/number_of_points)*8, canvas_size_y/2, canvas_size_y/90);
  circle(((canvas_size_x)/number_of_points)*9, canvas_size_y/2, canvas_size_y/90);
  circle(((canvas_size_x)/number_of_points)*10, canvas_size_y/2, canvas_size_y/90);
  circle(((canvas_size_x)/number_of_points)*11, canvas_size_y/2, canvas_size_y/90);
  strokeWeight(3);
  line(canvas_size_x/2-line_width_y/2, canvas_size_y/2-y_deviation, canvas_size_x/2+line_width_y/2, canvas_size_y/2-y_deviation);
  line(canvas_size_x/2-x_deviation, canvas_size_y/2+line_width_x/2, canvas_size_x/2-x_deviation, canvas_size_y/2-line_width_x/2);
  pop();
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
