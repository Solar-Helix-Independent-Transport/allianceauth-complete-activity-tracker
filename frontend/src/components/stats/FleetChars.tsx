import { getCatApi } from "../../api/Api";
import { components } from "../../api/CatApi";
import { useQuery } from "@tanstack/react-query";
import Card from "react-bootstrap/Card";
import { useParams } from "react-router-dom";

const getFleetCharacterChanges = async (fleetID: number) => {
  const { GET } = getCatApi();

  const { data, error } = await GET("/cat/api/fleets/{fleet_id}/character_changes", {
    params: {
      path: { fleet_id: fleetID },
    },
  });
  if (error) {
    console.log(error);
  } else {
    console.log(data);
    return data;
  }
};

const FleetCharacters = () => {
  const { fleetID } = useParams();

  const { data } = useQuery({
    queryKey: ["getFleetCharacterChanges", fleetID],
    queryFn: async () => await getFleetCharacterChanges(fleetID ? +fleetID : 0),
    refetchInterval: 5000,
  });

  return (
    <>
      {data?.map((countList: components["schemas"]["CountResponse"]) => {
        return (
          <Card className="m-4 flex-fill" style={{ minWidth: "24em" }}>
            <Card.Body>
              <Card.Title>{countList.name}</Card.Title>
              <hr />
              {countList.characters?.map((char: components["schemas"]["CharacterCount"]) => {
                return (
                  <Card.Text>
                    <div className="d-flex flex-row justify-content-between">
                      <span>{char.character.character_name}</span>
                      <span>
                        {char.count}/{countList.total}
                      </span>
                    </div>
                  </Card.Text>
                );
              })}
            </Card.Body>
          </Card>
        );
      })}
    </>
  );
};

export default FleetCharacters;
