import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, RealtimeChannel } from '@supabase/supabase-js'; // Replace with the correct import path

const TypingIndicatorProps = {
  roomId: '', // Define the type of roomId
  userId: '', // Define the type of userId
};

const Payload = {
  userId: '', // Define the type of userId
  // Add any other properties as needed
};

const useTypingIndicator = ({ roomId, userId }) => {
  const [isTyping, setIsTyping] = useState(false);
  const [payload, setPayload] = useState(null);
  const channelRef = useRef(null);

  useEffect(() => {
    const newChannel = supabase.channel(`typing:${roomId}`);

    const onTyping = (payload) => {
      setPayload(payload);
      setIsTyping(true);
      hideTypingIndicator();
    };

    const hideTypingIndicator = () => {
      setTimeout(() => setIsTyping(false), 2000);
    };

    newChannel.on('broadcast', { event: 'typing' }, onTyping);
    const subscription = newChannel.subscribe();

    channelRef.current = newChannel;

    return () => {
      subscription.unsubscribe();
    };
  }, [roomId, userId]);

  const throttledTypingEvent = useCallback(() => {
    if (!channelRef.current) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId },
    });
  }, [channelRef, userId]);

  const sendTypingEvent = useCallback(() => {
    throttledTypingEvent();
  }, [throttledTypingEvent]);

  return { payload, isTyping, sendTypingEvent };
};

export default useTypingIndicator;