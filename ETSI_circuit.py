import spc
from time import sleep


def main():
    with spc.FlightController() as fc:
        # # # # # # # # # # # # # # # # # # # # # # # # # # # #
        # SET T.O. CONFIG
        # # # # # # # # # # # # # # # # # # # # # # # # # # # #
        fc.set_parking_break()
        fc.set_beacon_lights(True)
        fc.set_landing_lights(True)
        fc.set_landing_lights(True)
        fc.set_taxi_lights(True)
        fc.set_nav_lights(True)
        fc.set_strobe_lights(True)
        fc.set_flaps(0.39)
        fc.set_aileron_trim(fc.get_takeoff_trim())
        fc.set_fuel_pump(True)

        fc.set_ap_heading_select_engage(False)
        # fc.exec_takeoff(60, 500)


if __name__ == "__main__":
    main()
