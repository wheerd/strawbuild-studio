import { useMemo, useCallback } from 'react'
import { useFloors } from '../../../model/store'
import { useActiveFloorId, useEditorStore } from '../hooks/useEditorStore'
import { useModelStore } from '../../../model/store'
import type { FloorId } from '../../../types/ids'

export function FloorSelector (): React.JSX.Element {
  const allFloors = useFloors()
  const activeFloorId = useActiveFloorId()

  // Use individual selectors to avoid object creation
  const setActiveFloor = useEditorStore(state => state.setActiveFloor)
  const addFloor = useModelStore(state => state.addFloor)

  const floors = useMemo(() => {
    return Array.from(allFloors.values()).sort((a, b) => a.level - b.level)
  }, [allFloors])

  const handleFloorChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const floorId = e.target.value as FloorId
    if (floorId !== activeFloorId) {
      setActiveFloor(floorId)
    }
  }, [activeFloorId, setActiveFloor])

  const handleAddFloor = useCallback(() => {
    const maxLevel = floors.length > 0 ? Math.max(...floors.map(f => f.level)) : -1
    const newFloor = addFloor(`Floor ${maxLevel + 2}`, maxLevel + 1)
    setActiveFloor(newFloor.id)
  }, [floors, addFloor, setActiveFloor])

  return (
    <div className='floor-selector'>
      <label htmlFor='floor-select'>Floor:</label>
      <select
        id='floor-select'
        value={activeFloorId}
        onChange={handleFloorChange}
      >
        {floors.map(floor => (
          <option key={floor.id} value={floor.id}>
            {floor.name}
          </option>
        ))}
      </select>
      <div className='floor-actions'>
        <button onClick={handleAddFloor} title='Add Floor'>
          +
        </button>
      </div>
    </div>
  )
}