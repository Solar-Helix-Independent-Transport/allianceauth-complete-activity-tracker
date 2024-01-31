import { Cat } from "../api/Cat";
import cookies from "js-cookies";
import { useState } from "react";
import Button from "react-bootstrap/Button";

const performCloseFleetRequest = async (fleetID: number) => {
  console.log("performTrackFleetRequest", fleetID);
  const api = new Cat();
  const response = await api.aacatApiEndFleet(fleetID, {
    headers: { "X-Csrftoken": cookies.getItem("csrftoken") },
  });
  console.log(response);

  return response.data;
};

const CloseFleetButton = ({ fleet_id }: { fleet_id: number }) => {
  const [data, setData] = useState(undefined);

  async function closeFleet() {
    setData(await performCloseFleetRequest(fleet_id));
  }

  return (
    <Button variant="warning" disabled={data} onClick={closeFleet} className="w-100 mt-2">
      {data ? data[0] : "Stop Tracking Fleet"}
    </Button>
  );
};

export default CloseFleetButton;
