import { getCatApi } from "../../api/Api";
import { useState } from "react";
import Button from "react-bootstrap/Button";

const CloseFleetButton = ({ fleet_id }: { fleet_id: number }) => {
  const { POST } = getCatApi();
  const [data, setData] = useState("");

  async function closeFleet() {
    const { data, error } = await POST("/cat/api/fleets/{fleet_id}/end", {
      params: {
        path: { fleet_id: fleet_id },
      },
    });
    if (error) {
      console.log(error);
    } else {
      console.log(data);
      setData(`${data}`);
    }
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
