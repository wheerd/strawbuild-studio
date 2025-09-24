import type { Tool } from './types'

/**
 * Abstract base class for tools that provides common functionality.
 *
 * This class handles the common pattern of listener management for tool state changes.
 * Tools that extend this class get automatic listener management and just need to call
 * `triggerRender()` when their state changes.
 *
 * @example
 * ```ts
 * export class MyTool extends BaseTool implements Tool {
 *   readonly id = 'my-tool'
 *   readonly name = 'My Tool'
 *   // ... other Tool interface properties
 *
 *   public state = { someValue: 0 }
 *
 *   updateValue(newValue: number): void {
 *     this.state.someValue = newValue
 *     this.triggerRender() // Notifies all subscribed components
 *   }
 * }
 * ```
 */
export abstract class BaseTool implements Pick<Tool, 'onRenderNeeded'> {
  private listeners: (() => void)[] = []

  /**
   * Register a listener that will be called whenever the tool's state changes.
   * This is used by React components to know when to re-render.
   *
   * @param listener - Function to call when tool state changes
   * @returns Cleanup function to unregister the listener
   */
  onRenderNeeded(listener: () => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  /**
   * Notify all registered listeners that the tool's state has changed.
   * Call this method whenever you modify the tool's state to ensure
   * React components re-render appropriately.
   */
  protected triggerRender(): void {
    this.listeners.forEach(listener => listener())
  }
}
