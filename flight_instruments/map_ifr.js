let increase_canvas_x = 200;
let increase_canvas_y = 200;

const canvas_size_x = 686 + increase_canvas_x;
const canvas_size_y = 685 + increase_canvas_y;

// ref_a has to always be NW to ref_b
const ref_a = [0 + increase_canvas_x, 0 + increase_canvas_y, 11.333333, 48.866667];
const ref_b = [685, 684, 11.733333, 48.6];

const rwy_25L = {
  start_lat: 48.714378,
  start_lon: 11.555789,
  end_lat: 48.704578,
  end_lon: 11.518683,
};

const rwy_25R = {
  start_lat: 48.7248,
  start_lon: 11.546167,
  end_lat: 48.716667,
  end_lon: 11.515383,
};

const VADAN = {
  lat: 48.745781,
  lon: 11.675081,
};

const SI452 = {
  lat: 48.791733,
  lon: 11.850781,
};

const SI451 = {
  lat: 48.886389,
  lon: 11.813056,
};

let curr_lat = 0.0;
let curr_lon = 0.0;
let curr_heading = 0.0;
let curr_height = 0.0;
let curr_tailnumber = "";
let curr_transponder_code = 0;

let flight_path_history = [];
let flight_path_history_counter = 0;

function setup() {
  // Check if ref_a is NW to ref_b
  if (ref_a[2] > ref_b[2] || ref_a[3] < ref_b[3]) {
    console.log("Error, ref_a point is not NW to ref_a point!");
    return;
  }

  // Create canvas
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
    curr_tailnumber = pos_obj["tailnumber"];
    curr_transponder_code = pos_obj["transponder_code"];
  };
}

function draw() {
  background(43, 49, 59);

  // Draw ETSI Rwys
  draw_runway(rwy_25L.start_lat, rwy_25L.start_lon, rwy_25L.end_lat, rwy_25L.end_lon);
  draw_runway(rwy_25R.start_lat, rwy_25R.start_lon, rwy_25R.end_lat, rwy_25R.end_lon);

  // Draw GNSS Approach WPs
  draw_waypoint(VADAN.lat, VADAN.lon);
  draw_waypoint(SI451.lat, SI451.lon);
  draw_waypoint(SI452.lat, SI452.lon);
  draw_course([SI451, SI452, VADAN, { lat: rwy_25L.start_lat, lon: rwy_25L.start_lon }]);

  // Calculate current position in pixels
  coord = get_pixels_from_geo_coordinates(curr_lat, curr_lon);

  // Draw path
  stroke(148, 255, 49);
  if (flight_path_history_counter == 10) {
    flight_path_history.push(coord);
    flight_path_history_counter = 0;
  } else {
    flight_path_history_counter++;
  }
  flight_path_history.forEach((elem) => {
    circle(elem[0], elem[1], 2);
  });
  if (flight_path_history.length > 10) {
    flight_path_history.shift();
  }

  // Draw plane on map
  draw_plane(coord[0], coord[1], curr_heading);
}

function draw_runway(a_lat, a_lon, b_lat, b_lon) {
  coord_a = get_pixels_from_geo_coordinates(a_lat, a_lon);
  coord_b = get_pixels_from_geo_coordinates(b_lat, b_lon);
  push();
  stroke(180);
  strokeWeight(4);
  line(coord_a[0], coord_a[1], coord_b[0], coord_b[1]);
  pop();
}

function draw_waypoint(lat, lon) {
  coord = get_pixels_from_geo_coordinates(lat, lon);
  push();
  noFill();
  stroke(180);
  strokeWeight(1);
  triangle(coord[0], coord[1] - 10, coord[0] + 5, coord[1], coord[0] - 5, coord[1]);
  triangle(coord[0] - 10, coord[1], coord[0], coord[1] + 5, coord[0], coord[1] - 5);
  triangle(coord[0], coord[1] + 10, coord[0] + 5, coord[1], coord[0] - 5, coord[1]);
  triangle(coord[0] + 10, coord[1], coord[0], coord[1] + 5, coord[0], coord[1] - 5);
  fill(43, 49, 59);
  circle(coord[0], coord[1], 10);
  pop();
}

function draw_course(waypoints) {
  waypoints.forEach((elem, index) => {
    if (index + 1 < waypoints.length) {
      coord_a = get_pixels_from_geo_coordinates(elem.lat, elem.lon);
      coord_b = get_pixels_from_geo_coordinates(waypoints[index + 1].lat, waypoints[index + 1].lon);
      push();
      stroke(180);
      strokeWeight(1);
      line(coord_a[0], coord_a[1], coord_b[0], coord_b[1]);
      pop();
    }
  });
}

function draw_plane(x, y, heading) {
  push();
  translate(x, y);
  angleMode(DEGREES);
  rotate(heading);
  rectMode(CENTER);
  noFill();
  stroke(148, 255, 49);
  strokeWeight(3);
  rect(0, 0, 10);
  line(0, 0, 0, -35);
  text(curr_tailnumber);
  pop();
  push();
  textSize(16);
  fill(148, 255, 49);
  text(curr_tailnumber, x, y - 60);
  text(curr_transponder_code, x, y - 40);
  text(Math.round(curr_height * 3.28084), x, y - 20);
  pop();
}

function get_pixels_from_geo_coordinates(lat, lon) {
  x = map(lon, ref_a[2], ref_b[2], ref_a[0], ref_b[0]);
  y = map(lat, ref_a[3], ref_b[3], ref_a[1], ref_b[1]);
  return [x, y];
}
