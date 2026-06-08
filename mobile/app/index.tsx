import { Redirect } from 'expo-router';

/** Dev entry: jump straight to the demo course edit screen. */
export default function Index() {
  return <Redirect href="/course/demo-1/edit" />;
}
