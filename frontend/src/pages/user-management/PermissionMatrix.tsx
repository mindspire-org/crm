import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PERMISSION_MODULES, ACTIONS } from "./permissions.constants";

interface PermissionMatrixProps {
  permissions: Set<string>;
  onChange: (permissions: Set<string>) => void;
  disabled?: boolean;
}

export function PermissionMatrix({ permissions, onChange, disabled }: PermissionMatrixProps) {
  const togglePermission = (perm: string) => {
    const next = new Set(permissions);
    if (next.has(perm)) {
      next.delete(perm);
    } else {
      next.add(perm);
    }
    onChange(next);
  };

  const isChecked = (perm: string) => permissions.has(perm);

  const toggleRow = (moduleId: string, submoduleId: string, checked: boolean) => {
    const next = new Set(permissions);
    ACTIONS.forEach((action) => {
      const perm = `${moduleId}:${submoduleId}:${action.id}`;
      if (checked) {
        next.add(perm);
      } else {
        next.delete(perm);
      }
    });
    onChange(next);
  };

  const isRowChecked = (moduleId: string, submoduleId: string) => {
    return ACTIONS.every((action) => permissions.has(`${moduleId}:${submoduleId}:${action.id}`));
  };

  const isRowIndeterminate = (moduleId: string, submoduleId: string) => {
    const rowPerms = ACTIONS.map((action) => `${moduleId}:${submoduleId}:${action.id}`);
    const checkedCount = rowPerms.filter((p) => permissions.has(p)).length;
    return checkedCount > 0 && checkedCount < ACTIONS.length;
  };

  return (
    <div className="rounded-md border border-input bg-background">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[200px]">Module / Sub-module</TableHead>
            <TableHead className="w-[80px] text-center">All</TableHead>
            {ACTIONS.map((action) => (
              <TableHead key={action.id} className="text-center">
                {action.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {PERMISSION_MODULES.map((module) => (
            <React.Fragment key={module.id}>
              <TableRow className="bg-muted/20 font-medium">
                <TableCell colSpan={ACTIONS.length + 2}>{module.label}</TableCell>
              </TableRow>
              {module.submodules.map((sub) => (
                <TableRow key={`${module.id}-${sub.id}`}>
                  <TableCell className="pl-6 text-sm text-muted-foreground">
                    {sub.label}
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={isRowChecked(module.id, sub.id)}
                      onCheckedChange={(checked) => toggleRow(module.id, sub.id, !!checked)}
                      disabled={disabled}
                    />
                  </TableCell>
                  {ACTIONS.map((action) => {
                    const perm = `${module.id}:${sub.id}:${action.id}`;
                    return (
                      <TableCell key={action.id} className="text-center">
                        <Checkbox
                          checked={isChecked(perm)}
                          onCheckedChange={() => togglePermission(perm)}
                          disabled={disabled}
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
