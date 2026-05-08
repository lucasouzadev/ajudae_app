import React from "react";
import {
  KeyboardAwareScrollView,
  KeyboardAwareScrollViewProps,
} from "react-native-keyboard-controller";
import { Platform, ScrollView, ScrollViewProps } from "react-native";

type Props = KeyboardAwareScrollViewProps & ScrollViewProps;

export const KeyboardAwareScrollViewCompat = React.forwardRef<any, Props>(
  ({ children, keyboardShouldPersistTaps = "handled", bottomOffset, ...props }, ref) => {
    if (Platform.OS === "web") {
      return (
        <ScrollView ref={ref} keyboardShouldPersistTaps={keyboardShouldPersistTaps} {...props}>
          {children}
        </ScrollView>
      );
    }

    return (
      <KeyboardAwareScrollView
        ref={ref}
        bottomOffset={bottomOffset}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        {...props}
      >
        {children}
      </KeyboardAwareScrollView>
    );
  },
);

KeyboardAwareScrollViewCompat.displayName = "KeyboardAwareScrollViewCompat";
