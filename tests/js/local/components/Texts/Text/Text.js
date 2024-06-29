import "./Text.css";

export function Text(props) {
  return <p className={"Text " + props.className}>{props.children}</p>;
}
