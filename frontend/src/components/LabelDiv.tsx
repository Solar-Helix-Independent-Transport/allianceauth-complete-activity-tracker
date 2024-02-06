const LabelDiv = ({
  label,
  value,
}: {
  label: string | null | undefined;
  value: string | null | undefined;
}) => {
  return (
    <div className="d-flex flex-row">
      <p>{label}</p>
      <p className="ms-auto">{value}</p>
    </div>
  );
};

export default LabelDiv;
