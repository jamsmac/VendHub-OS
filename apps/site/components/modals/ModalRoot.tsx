"use client";

import dynamic from "next/dynamic";
import { useModal } from "@/lib/modal-context";

const ProductModal = dynamic(() => import("@/components/modals/ProductModal"), {
  ssr: false,
});
const MachineModal = dynamic(() => import("@/components/modals/MachineModal"), {
  ssr: false,
});

export default function ModalRoot() {
  const { modal, closeModal } = useModal();

  if (modal.type === "product") {
    return <ProductModal product={modal.data} onClose={closeModal} />;
  }

  if (modal.type === "machine") {
    return (
      <MachineModal
        machine={modal.data}
        onClose={closeModal}
        distance={modal.distance}
      />
    );
  }

  return null;
}
