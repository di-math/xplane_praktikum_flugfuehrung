import xpc
from time import sleep


class FlightController:

    def __init__(self, xpHost='10.84.56.245', xpPort=49009, port=0, timeout=200):
        self.xpc = xpc.XPlaneConnect(xpHost, xpPort, port, timeout)

    # Define __enter__ and __exit__ to support the `with` construct.
    def __enter__(self):
        self.xpc.__enter__()
        # Verify connection
        try:
            # If X-Plane does not respond to the request, a timeout error
            # will be raised.
            self.xpc.getDREF("sim/test/test_float")
        except:
            print("Error establishing connection to X-Plane.")
            print("Exiting...")
            return
        return self

    def __exit__(self, type, value, traceback):
        return self.xpc.__exit__(type, value, traceback)

    def map_value(self, value, old_min, old_max, new_min, new_max):
        return new_min + ((value - old_min) * (new_max - new_min) / (old_max - old_min))

    def exec_takeoff(self, vr: float, target_vs: float) -> None:
        initial_heading = self.get_heading_vacuum_deg_mag_pilot() + 3

        # set power
        print("Initiate Takeoff.")
        self.set_throttle(1.0)
        print("Throttle set.")
        sleep(2)
        self.set_parking_break(False)

        # Accelerate to vr
        while True:
            rudder_correction = self.map_value(
                self.keep_heading_on_ground(
                    initial_heading-self.get_heading_vacuum_deg_mag_pilot()),
                -180, 180,
                -1.0, 1.0)
            self.set_rudder(rudder_correction)
            self.set_elevator(-0.25)
            if (self.get_IAS() >= vr):
                print("vr, rotate.")
                self.set_elevator(0.1)
                break
            sleep(0.2)

        # Set Autopilort
        self.set_autopilot(2)
        self.set_ap_heading(initial_heading)
        self.set_ap_vs(target_vs)

    def keep_heading_on_ground(self, heading_diff: float) -> float:
        return (heading_diff)**2

    def get_takeoff_trim(self) -> float:
        return self.xpc.getDREF("sim/aircraft/controls/acf_takeoff_trim")[0]

    def get_true_heading(self) -> float:
        return self.xpc.getDREF("sim/flightmodel/position/psi")[0]

    def get_true_mag_heading(self) -> float:
        return self.xpc.getDREF("sim/flightmodel2/position/mag_psi")[0]

    def get_heading_vacuum_deg_mag_pilot(self) -> float:
        return self.xpc.getDREF("sim/cockpit2/gauges/indicators/heading_vacuum_deg_mag_pilot")[0]

    def get_is_on_ground(self) -> bool:
        on_ground = False
        on_ground_list = self.xpc.getDREF("sim/flightmodel2/gear/on_ground")
        on_ground = any(elem != 0.0 for elem in on_ground_list)
        return on_ground

    def get_IAS(self) -> float:
        return self.xpc.getDREF("sim/flightmodel/position/indicated_airspeed")[0]

    def get_altitude_ft_pilot(self) -> float:
        return self.xpc.getDREF("sim/cockpit2/gauges/indicators/altitude_ft_pilot")[0]

    def set_aileron_trim(self, value: float) -> None:
        self.xpc.sendDREF("sim/flightmodel/controls/elv_trim", value)

    def set_flaps(self, flaps: float) -> None:
        self.xpc.sendDREF("sim/flightmodel/controls/flaprqst", flaps)

    def set_parking_break(self, value=1.0) -> None:
        self.xpc.sendDREF("sim/multiplayer/controls/parking_brake", value)

    def set_landing_lights(self, value: bool) -> None:
        self.xpc.sendDREF("sim/cockpit/electrical/landing_lights_on", value)

    def set_nav_lights(self, value: bool) -> None:
        self.xpc.sendDREF("sim/cockpit/electrical/nav_lights_on", value)

    def set_strobe_lights(self, value: bool) -> None:
        self.xpc.sendDREF("sim/cockpit/electrical/strobe_lights_on", value)

    def set_beacon_lights(self, value: bool) -> None:
        self.xpc.sendDREF("sim/cockpit/electrical/beacon_lights_on", value)

    def set_taxi_lights(self, value: bool) -> None:
        self.xpc.sendDREF("sim/cockpit/electrical/taxi_light_on", value)

    def set_fuel_pump(self, value: bool) -> None:
        self.xpc.sendDREF("sim/cockpit/engine/fuel_pump_on", value)

    def set_ap_heading(self, value: float) -> None:
        self.xpc.sendDREF("sim/cockpit/autopilot/heading", value)

    def set_throttle(self, value: float) -> None:
        self.xpc.sendDREF(
            "sim/multiplayer/controls/engine_throttle_request", value)

    def set_ap_vs(self, value: float) -> None:
        self.xpc.sendDREF("sim/cockpit/autopilot/vertical_velocity", value)

    def set_autopilot(self, value: int) -> None:
        self.xpc.sendDREF("sim/cockpit/autopilot/autopilot_mode", value)

    def set_ap_heading_select_engage(self, value: bool) -> None:
        current_value = int(self.xpc.getDREF(
            "sim/cockpit/autopilot/autopilot_state")[0])
        current_value = current_value & ~2
        self.xpc.sendDREF("sim/cockpit/autopilot/autopilot_state",
                          current_value | ((value*2)))

    def set_rudder(self, value: float) -> None:
        self.xpc.sendCTRL([-998, -998, value, -998, -998, -998])

    def set_elevator(self, value: float) -> None:
        self.xpc.sendCTRL([value, -998, -998, -998, -998, -998])
