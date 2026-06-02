import ActiveFleetList from "./ActiveFleetList";
import TrackFleetSearch from "./TrackFleetSearch";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";

const ActiveFleetSelect = () => {
  return (
    <Row className="m-2 g-3 align-items-start">
      <Col xs="auto">
        <TrackFleetSearch />
      </Col>
      <Col>
        <Card>
          <Card.Header className="fw-semibold">Active Fleets</Card.Header>
          <Card.Body className="p-0">
            <ActiveFleetList />
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default ActiveFleetSelect;
