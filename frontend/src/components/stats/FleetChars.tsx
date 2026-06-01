import { getFleetCharacterChanges } from "../../api/Methods";
import { components } from "../../api/CatApi";
import { useFleetId } from "../../hooks/useFleetId";
import { useQuery } from "@tanstack/react-query";
import Card from "react-bootstrap/Card";
import Spinner from "react-bootstrap/Spinner";

const FleetCharacters = () => {
  const fleetId = useFleetId();

  const { data, isPending } = useQuery({
    queryKey: ["getFleetCharacterChanges", fleetId],
    queryFn: async () => await getFleetCharacterChanges(fleetId),
    refetchInterval: 5000,
  });

  if (isPending) {
    return <Spinner animation="border" className="m-2" />;
  }

  return (
    <>
      {data?.map((countList: components["schemas"]["CountResponse"]) => (
        <Card key={countList.name} className="m-1 flex-fill" style={{ minWidth: "24em" }}>
          <Card.Body>
            <Card.Title>{countList.name}</Card.Title>
            <hr />
            {countList.characters?.map((char: components["schemas"]["CharacterCount"]) => (
              <Card.Text key={char.character.character_id}>
                <div className="d-flex flex-row justify-content-between">
                  <span>{char.character.character_name}</span>
                  <span>
                    {char.count}/{countList.total}
                  </span>
                </div>
              </Card.Text>
            ))}
          </Card.Body>
        </Card>
      ))}
    </>
  );
};

export default FleetCharacters;
