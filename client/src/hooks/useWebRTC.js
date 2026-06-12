import { useEffect, useRef, useState } from "react";

export default function useWebRTC(socket, roomId, userId, remoteUserId) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [connectionState, setConnectionState] = useState("new");

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteUserIdRef = useRef(remoteUserId);
  const pendingOffersRef = useRef([]);
  const pendingIceCandidatesRef = useRef([]);
  const remoteDescriptionSetRef = useRef(false);
  const processPendingOffersRef = useRef(null);

  remoteUserIdRef.current = remoteUserId;

  // Acquire camera/mic once per room session
  useEffect(() => {
    if (!socket || !roomId || !userId) return;

    let cancelled = false;

    const acquireMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: true,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        stream.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });

        localStreamRef.current = stream;
        setLocalStream(stream);
      } catch (error) {
        console.error("Failed to get user media:", error);
        setConnectionState("failed");
      }
    };

    acquireMedia();

    return () => {
      cancelled = true;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      setLocalStream(null);
      pendingOffersRef.current = [];
      pendingIceCandidatesRef.current = [];
    };
  }, [socket, roomId, userId]);

  // Always listen for signaling so early offers are not dropped
  useEffect(() => {
    if (!socket) return;

    const handleOffer = async ({ offer, senderId }) => {
      const expectedRemote = remoteUserIdRef.current;
      if (expectedRemote && senderId !== expectedRemote) return;

      pendingOffersRef.current.push({ offer, senderId });

      if (processPendingOffersRef.current) {
        await processPendingOffersRef.current();
      }
    };

    const handleAnswer = async ({ answer, senderId }) => {
      if (senderId !== remoteUserIdRef.current || !pcRef.current) return;

      try {
        await pcRef.current.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
        remoteDescriptionSetRef.current = true;

        const pc = pcRef.current;
        const queue = [...pendingIceCandidatesRef.current];
        pendingIceCandidatesRef.current = [];
        for (const candidate of queue) {
          await pc.addIceCandidate(candidate);
        }
      } catch (error) {
        console.error("Error handling answer:", error);
        setConnectionState("failed");
      }
    };

    const handleIceCandidate = async ({ candidate, senderId }) => {
      if (
        remoteUserIdRef.current &&
        senderId !== remoteUserIdRef.current
      ) {
        return;
      }

      const iceCandidate = new RTCIceCandidate(candidate);

      if (!pcRef.current || !remoteDescriptionSetRef.current) {
        pendingIceCandidatesRef.current.push(iceCandidate);
        return;
      }

      try {
        await pcRef.current.addIceCandidate(iceCandidate);
      } catch {
        pendingIceCandidatesRef.current.push(iceCandidate);
      }
    };

    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleIceCandidate);

    return () => {
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("ice-candidate", handleIceCandidate);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket || !roomId || !userId || !remoteUserId || !localStreamRef.current) {
      return;
    }

    let cancelled = false;
    const remoteId = remoteUserId;

    const drainIceCandidates = async () => {
      const pc = pcRef.current;
      if (!pc || !remoteDescriptionSetRef.current) return;

      const queue = [...pendingIceCandidatesRef.current];
      pendingIceCandidatesRef.current = [];

      for (const candidate of queue) {
        try {
          await pc.addIceCandidate(candidate);
        } catch (error) {
          console.error("Error adding queued ICE candidate:", error);
        }
      }
    };

    const handleOfferInternal = async ({ offer, senderId }) => {
      const pc = pcRef.current;
      if (!pc || senderId !== remoteUserIdRef.current) return;

      try {
        setConnectionState("connecting");
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        remoteDescriptionSetRef.current = true;

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("answer", { answer, targetUserId: senderId });
        await drainIceCandidates();
      } catch (error) {
        console.error("Error handling offer:", error);
        setConnectionState("failed");
      }
    };

    const processPendingOffers = async () => {
      const offers = pendingOffersRef.current.filter(
        (o) =>
          o.senderId === remoteUserIdRef.current ||
          !remoteUserIdRef.current
      );

      pendingOffersRef.current = pendingOffersRef.current.filter(
        (o) => o.senderId !== remoteUserIdRef.current
      );

      for (const pending of offers) {
        if (pending.senderId === remoteUserIdRef.current) {
          await handleOfferInternal(pending);
        }
      }
    };

    processPendingOffersRef.current = processPendingOffers;

    const setupPeerConnection = async () => {
      try {
        const stream = localStreamRef.current;
        if (!stream || cancelled) return;

        remoteDescriptionSetRef.current = false;

        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
          ],
        });
        pcRef.current = pc;

        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        pc.ontrack = (event) => {
          const [incoming] = event.streams;
          if (incoming) {
            setRemoteStream(incoming);
            setIsCallActive(true);
            setConnectionState("connected");
          }
        };

        pc.onconnectionstatechange = () => {
          const state = pc.connectionState;
          setConnectionState(state);

          if (state === "connected") {
            setIsCallActive(true);
          } else if (state === "failed" || state === "disconnected") {
            setIsCallActive(false);
            setRemoteStream(null);
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate && remoteUserIdRef.current) {
            socket.emit("ice-candidate", {
              candidate: event.candidate,
              targetUserId: remoteUserIdRef.current,
            });
          }
        };

        await processPendingOffers();

        const shouldInitiate = userId.localeCompare(remoteId) < 0;

        if (shouldInitiate) {
          setConnectionState("connecting");
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("offer", { offer, targetUserId: remoteId });
        } else {
          setConnectionState("connecting");
        }
      } catch (error) {
        console.error("WebRTC peer connection setup error:", error);
        setConnectionState("failed");
      }
    };

    setupPeerConnection();

    return () => {
      cancelled = true;
      processPendingOffersRef.current = null;

      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }

      remoteDescriptionSetRef.current = false;
      setRemoteStream(null);
      setIsCallActive(false);
      setConnectionState("new");
    };
  }, [socket, roomId, userId, remoteUserId, localStream]);

  return {
    localStream,
    remoteStream,
    isCallActive,
    connectionState,
    isConnected:
      (connectionState === "connected" || isCallActive) && !!remoteStream,
  };
}
