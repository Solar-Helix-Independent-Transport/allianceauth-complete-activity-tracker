import { Cat } from "../../api/Cat";
import Cookies from "js-cookie";
import { useState } from "react";
import Button from "react-bootstrap/Button";

const performCloseFleetRequest = async (fleetID: number) => {
  console.log("performCloseFleetRequest", fleetID);
  const csrf = Cookies.get("csrftoken");
  const api = new Cat();
  const response = await api.aacatApiEndFleet(fleetID, {
    headers: { "X-Csrftoken": csrf ? csrf : "" },
  });
  console.log(response);

  return `${response.data[0]}`;
};

const CloseFleetButton = ({ fleet_id }: { fleet_id: number }) => {
  const [data, setData] = useState("");

  async function closeFleet() {
    setData(await performCloseFleetRequest(fleet_id));
  }

  return (
    <Button
      variant="warning"
      disabled={data ? true : false}
      onClick={closeFleet}
      className="w-100 mt-2"
    >
      {data ? data : "Stop Tracking Fleet"}
    </Button>
  );
};

export default CloseFleetButton;
