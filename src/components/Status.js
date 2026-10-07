export default function Status({ value }) {
  return <span className={`pill ${value}`}>{value}</span>;
}
