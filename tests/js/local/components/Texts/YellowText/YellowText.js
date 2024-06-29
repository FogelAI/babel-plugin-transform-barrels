import { Text } from "../Text/Text";
import "./YellowText.css";

export function YellowText(props) {
  return <Text className="YellowText">{props.children}</Text>;
}
