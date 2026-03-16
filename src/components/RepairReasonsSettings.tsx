"use client";

// Dependencies (install if not already present):
// npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

import React, { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GripVertical, Pencil, Trash2, Check, X, Plus } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Reason {
  id: string;
  label: string;
}

type SelectionMode = "single" | "multi";

interface ReasonListState {
  selectionMode: SelectionMode;
  reasons: Reason[];
}

// ---------------------------------------------------------------------------
// SortableReasonItem
// ---------------------------------------------------------------------------

interface SortableReasonItemProps {
  reason: Reason;
  onEdit: (id: string, newLabel: string) => void;
  onDelete: (id: string) => void;
}

function SortableReasonItem({
  reason,
  onEdit,
  onDelete,
}: SortableReasonItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(reason.label);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: reason.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed) onEdit(reason.id, trimmed);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(reason.label);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") handleCancel();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 px-3 py-2.5 rounded-md border bg-background hover:bg-muted/40 group transition-colors"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground touch-none shrink-0"
        tabIndex={-1}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Label / inline edit */}
      {isEditing ? (
        <Input
          autoFocus
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-7 text-sm flex-1"
        />
      ) : (
        <span className="flex-1 text-sm select-none">{reason.label}</span>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-0.5 shrink-0">
        {isEditing ? (
          <>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
              onClick={handleSave}
              aria-label="Save"
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground"
              onClick={handleCancel}
              aria-label="Cancel"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : (
          <>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => {
                setEditValue(reason.label);
                setIsEditing(true);
              }}
              aria-label="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(reason.id)}
              aria-label="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ReasonsList — one tab panel
// ---------------------------------------------------------------------------

interface ReasonsListProps {
  id: string; // used to scope RadioGroup ids
  state: ReasonListState;
  onChange: (state: ReasonListState) => void;
}

function ReasonsList({ id, state, onChange }: ReasonsListProps) {
  const [deleteTarget, setDeleteTarget] = useState<Reason | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = state.reasons.findIndex((r) => r.id === active.id);
      const newIndex = state.reasons.findIndex((r) => r.id === over.id);
      onChange({ ...state, reasons: arrayMove(state.reasons, oldIndex, newIndex) });
    }
  };

  const handleEdit = (itemId: string, newLabel: string) => {
    onChange({
      ...state,
      reasons: state.reasons.map((r) =>
        r.id === itemId ? { ...r, label: newLabel } : r
      ),
    });
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    onChange({
      ...state,
      reasons: state.reasons.filter((r) => r.id !== deleteTarget.id),
    });
    setDeleteTarget(null);
  };

  const handleAdd = () => {
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    onChange({
      ...state,
      reasons: [...state.reasons, { id: crypto.randomUUID(), label: trimmed }],
    });
    setNewLabel("");
    setIsAdding(false);
  };

  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAdd();
    if (e.key === "Escape") {
      setNewLabel("");
      setIsAdding(false);
    }
  };

  return (
    <>
      <div className="space-y-5">
        {/* Selection mode */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Selection mode</p>
          <RadioGroup
            value={state.selectionMode}
            onValueChange={(value) =>
              onChange({ ...state, selectionMode: value as SelectionMode })
            }
            className="flex gap-5"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="single" id={`${id}-single`} />
              <Label
                htmlFor={`${id}-single`}
                className="text-sm font-normal cursor-pointer"
              >
                Single select
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="multi" id={`${id}-multi`} />
              <Label
                htmlFor={`${id}-multi`}
                className="text-sm font-normal cursor-pointer"
              >
                Multi select
              </Label>
            </div>
          </RadioGroup>
          <p className="text-xs text-muted-foreground">
            {state.selectionMode === "single"
              ? "Customers can choose one reason per job."
              : "Customers can choose multiple reasons per job."}
          </p>
        </div>

        {/* Divider */}
        <div className="border-t" />

        {/* Reasons list */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              Reasons{" "}
              <span className="text-muted-foreground font-normal">
                ({state.reasons.length})
              </span>
            </p>
          </div>

          {state.reasons.length === 0 && !isAdding && (
            <div className="rounded-md border border-dashed py-8 text-center">
              <p className="text-sm text-muted-foreground">No reasons added yet.</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Click "Add reason" below to get started.
              </p>
            </div>
          )}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={state.reasons.map((r) => r.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1.5">
                {state.reasons.map((reason) => (
                  <SortableReasonItem
                    key={reason.id}
                    reason={reason}
                    onEdit={handleEdit}
                    onDelete={(itemId) =>
                      setDeleteTarget(
                        state.reasons.find((r) => r.id === itemId) ?? null
                      )
                    }
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Inline add row */}
          {isAdding ? (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-md border bg-background">
              <GripVertical className="h-4 w-4 text-muted-foreground/20 shrink-0" />
              <Input
                autoFocus
                placeholder="Enter reason label..."
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={handleAddKeyDown}
                className="h-7 text-sm flex-1"
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950 shrink-0"
                onClick={handleAdd}
                aria-label="Confirm add"
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground shrink-0"
                onClick={() => {
                  setNewLabel("");
                  setIsAdding(false);
                }}
                aria-label="Cancel add"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full border-dashed text-muted-foreground hover:text-foreground mt-1"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add reason
            </Button>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete reason?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>"{deleteTarget?.label}"</strong>? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const initialData: { repair: ReasonListState; replacement: ReasonListState } = {
  repair: {
    selectionMode: "multi",
    reasons: [
      { id: "r1", label: "Engine Failure" },
      { id: "r2", label: "Brake Issues" },
      { id: "r3", label: "Tire Damage" },
      { id: "r4", label: "Electrical Fault" },
    ],
  },
  replacement: {
    selectionMode: "single",
    reasons: [
      { id: "p1", label: "Cosmetic Damage Beyond Repair" },
      { id: "p2", label: "Total Loss" },
      { id: "p3", label: "Structural Damage" },
    ],
  },
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function RepairReasonsSettings() {
  const [data, setData] = useState(initialData);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Repair &amp; Replacement Reasons
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure the reasons shown to customers when logging jobs. Drag rows
          to reorder.
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="repair">
        <TabsList className="w-full">
          <TabsTrigger value="repair" className="flex-1">
            Repair Reasons
            <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
              {data.repair.reasons.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="replacement" className="flex-1">
            Replacement Reasons
            <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
              {data.replacement.reasons.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="repair" className="mt-5">
          <ReasonsList
            id="repair"
            state={data.repair}
            onChange={(repair) => setData((d) => ({ ...d, repair }))}
          />
        </TabsContent>

        <TabsContent value="replacement" className="mt-5">
          <ReasonsList
            id="replacement"
            state={data.replacement}
            onChange={(replacement) => setData((d) => ({ ...d, replacement }))}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
