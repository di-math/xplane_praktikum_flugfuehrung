// ref_a has to always be NW to ref_b
const ref_a = [0, 0, 11.333333, 48.866667];
const ref_b = [685, 684, 11.733333, 48.6];

let curr_lat = 0.0;
let curr_lon = 0.0;
let curr_heading = 0.0;

const min_dist_ac_wp = 50;

let waypoint_list_window_width = 700;
let waypoint_list_window_height = 700;

const wind = {direction: 0, speed: 5.14};
const speed = 27.7778; // m/s

let flight_path_history = [];
let waypoints = [];

function preload() {
  // Load map as background (0, 0, 11.333333, 48.866667), (685, 684, 11.733333, 48.6)
  // etsi_vfr1 reference points:
  map_background = loadImage("assets/etsi_vfr1.png");

  // Load airplane image
  airplane_img = loadImage("assets/airplane.png");
}

function setup() {
  // Check if ref_a is NW to ref_b
  if (ref_a[2] > ref_b[2] || ref_a[3] < ref_b[3]) {
    console.log("Error, ref_a point is not NW to ref_a point!");
    return;
  }

  // Create canvas at the size of the map background
  createCanvas(map_background.width + waypoint_list_window_width, map_background.height);
  frameRate(2);

  // Setup websocket
  const socket = new WebSocket("ws://localhost:8080");
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

  // Draw waypoint list window
  fill(43, 49, 59)
  noStroke()
  rect(map_background.width, 0, waypoint_list_window_width, waypoint_list_window_height);

  // Visualize and calculate waypoints
  let entry_count = 1;
  let total_flight_time = 0;
  let total_dist = 0;
  for(let i = 0; i < waypoints.length; i++) {
    // check if waypoint reached
    if(waypoint_reached(waypoints[i].lat, waypoints[i].lon)){
      waypoints[i].passed = true;
      waypoints[i].passed_timestamp = Date.now();
    }
    // Draw waypoint on map
    draw_waypoint(waypoints[i].lat, waypoints[i].lon, waypoints[i].passed)
    // Draw leg to next waypoint
    if (i + 1 < waypoints.length) {
      let coord_a = get_pixels_from_geo_coordinates(waypoints[i].lat, waypoints[i].lon);
      let coord_b = get_pixels_from_geo_coordinates(waypoints[i + 1].lat, waypoints[i + 1].lon);
      push();
      if(waypoints[i].passed && waypoints[i + 1].passed) {
        stroke(180);
      } else {
        stroke(252, 131, 56);
      }
      strokeWeight(3);
      line(coord_a[0], coord_a[1], coord_b[0], coord_b[1]);
      pop();
    }
    // Make entry in waypoint list window
    let padding_left = 20;
    let padding_top = 40;
    textSize(12);
    if(waypoints[i].passed) {
      fill(180)
    } else {
      fill('yellow');
    }
    text(`Waypoint ${i+1} - lat: ${waypoints[i].lat.toFixed(5)} - lon: ${waypoints[i].lon.toFixed(5)}`, map_background.width + padding_left, padding_top * (entry_count));
    entry_count++;
    // Make entry for leg 
    if (i + 1 < waypoints.length) {
      let dist = heaversine_dist(waypoints[i].lat, waypoints[i].lon, waypoints[i + 1].lat, waypoints[i + 1].lon);
      let rwk = calculate_rwk(waypoints[i].lat, waypoints[i].lon, waypoints[i + 1].lat, waypoints[i + 1].lon);
      let headwind = calculate_headwind(rwk);
      let leg_time = dist / speed + headwind;
      total_dist = total_dist + dist;
      total_flight_time = total_flight_time + leg_time;
      if(waypoints[i].passed && waypoints[i + 1].passed) {
        fill(180);
        let acutal_leg_time = (waypoints[i + 1].passed_timestamp - waypoints[i].passed_timestamp) / 1000;
        text(`     rwk: ${Math.round(rwk)}° \t|\t dist: ${Math.round(dist)}m \t|\t ete: ${Math.round(leg_time)}s \t|\t total dist: ${Math.round(total_dist)}m \t|\t total flight time: ${Math.round(total_flight_time)}s \t|\t actual: ${Math.round(acutal_leg_time)}s`, map_background.width + padding_left, padding_top * (entry_count));
      } else {
        fill('yellow');
        text(`     rwk: ${Math.round(rwk)}° \t|\t dist: ${Math.round(dist)}m \t|\t ete: ${Math.round(leg_time)}s \t|\t total dist: ${Math.round(total_dist)}m \t|\t total flight time: ${Math.round(total_flight_time)}s`, map_background.width + padding_left, padding_top * (entry_count));
      }
      entry_count++;
    }
  }

  // Calculate current position in pixels
  let coord = get_pixels_from_geo_coordinates(curr_lat, curr_lon);

  // Draw path
  stroke(255, 0, 0);
  if(coord[0] <= map_background.width && coord[1] <= map_background.height){flight_path_history.push(coord)}
  flight_path_history.forEach((elem) => {
    circle(elem[0], elem[1], 2);
  });
  if (flight_path_history.length > 500) {
    flight_path_history.shift();
  }

  // Draw plane on map
  if(coord[0] <= map_background.width && coord[1] <= map_background.height){draw_plane(coord[0], coord[1], curr_heading)}

}

function mouseClicked(){
  if(mouseX <= map_background.width && mouseY <= map_background.height) {
    let coord = get_geo_coordinates_from_pixel(mouseX, mouseY);
    waypoints.push({lon: coord[0], lat: coord[1], passed: false, passed_timestamp: null});
  }
}

function draw_plane(x, y, heading) {
  push();
  airplane_img.resize(50, 0);
  imageMode(CENTER);
  translate(x, y);
  angleMode(DEGREES);
  rotate(heading);
  image(airplane_img, 0, 0);
  pop();
}

function get_pixels_from_geo_coordinates(lat, lon) {
  x = map(lon, ref_a[2], ref_b[2], ref_a[0], ref_b[0]);
  y = map(lat, ref_a[3], ref_b[3], ref_a[1], ref_b[1]);
  return [x, y];
}

function get_geo_coordinates_from_pixel(x, y) {
  lat = map(x, ref_a[0], ref_b[0], ref_a[2], ref_b[2]);
  lon = map(y, ref_a[1], ref_b[1], ref_a[3], ref_b[3]);
  return [lat, lon];
}

function draw_waypoint(lat, lon, passed) {
  coord = get_pixels_from_geo_coordinates(lat, lon);
  push();
  noFill();
  if(passed) {
    stroke(180);
    fill(180);
  } else {
    stroke(252, 131, 56);
    fill(252, 131, 56);
  }
  strokeWeight(1);
  triangle(coord[0], coord[1] - 10, coord[0] + 5, coord[1], coord[0] - 5, coord[1]);
  triangle(coord[0] - 10, coord[1], coord[0], coord[1] + 5, coord[0], coord[1] - 5);
  triangle(coord[0], coord[1] + 10, coord[0] + 5, coord[1], coord[0] - 5, coord[1]);
  triangle(coord[0] + 10, coord[1], coord[0], coord[1] + 5, coord[0], coord[1] - 5);
  circle(coord[0], coord[1], 10);
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

function heaversine_dist(lat1, lon1, lat2, lon2){
  const R = 6371e3;
  const phi1 = lat1 * (Math.PI/180); 
  const phi2 = lat2 * (Math.PI/180);
  const deltaPhi = (lat2-lat1) * (Math.PI/180);
  const deltaLambda = (lon2-lon1) * (Math.PI/180);

  const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  const d = R * c; 
  return d;
}

function calculate_rwk(lat1, lon1, lat2, lon2){
  let rwk=NaN;
  if ((lon1-lon2) == 0.0 && (lat1-lat2) >0.0) {
    rwk=180.0;
  }
  else if  ((lon1-lon2) == 0.0 && (lat1-lat2) <0.0) {
    rwk = 0.0; 
  }
  else if  ((lon1-lon2) > 0.0 && (lat1-lat2) == 0.0) {
    rwk = 270.0;
  }
  else if  ((lon1-lon2) < 0.0 && (lat1-lat2) == 0.0) {   
    rwk = 90.0;
  }  
  else if(((lon1-lon2) < 0.0) ) {
    rwk = (Math.PI/2.0 - Math.atan( ((lat1-lat2)*60.0*1852.0) / ((lon1-lon2)*cos((lat1* (Math.PI/180)))*60.0*1852.0) ) ) * (180/Math.PI);
  }
  else if (((lon1-lon2) > 0.0) ) {
    rwk = (3.0/2.0*Math.PI- Math.atan(((lat1-lat2)*60.0*1852.0) / ((lon1-lon2)*cos((lat1 * (Math.PI/180)))*60.0*1852.0) ) ) * (180/Math.PI);
  }
  return rwk;
}

function calculate_headwind(course){
  if(course == wind.direction || course % 360 == wind.direction % 360) {
    return -wind.speed;
  }
  else if(((course+180) % 360) == wind.direction) {
    return wind.speed;
  }
  else if(((course+90) % 360) == wind.direction || (course-90 % 360) == wind.direction) {
    return 0;
  }
  let alpha = (wind.direction - (180 + course));
  if(alpha < 0) {
    let alpha_rad = -1 * alpha * (Math.PI/180);
    return (wind.speed * Math.cos(alpha_rad));
  } else {
    let alpha_rad = alpha * (Math.PI/180);
    return -(wind.speed * Math.cos(alpha_rad));
  }
}

function waypoint_reached(lat, lon){
  return heaversine_dist(lat, lon, curr_lat, curr_lon) < min_dist_ac_wp;
}
