import { For, type JSX } from 'solid-js';
import type { StreamLineRecordOutput } from '#src/monitor/app/monitor/api/monitor-api-shapes';
import '#src/web/components/gl-log-stream/gl-log-stream.css';

export interface GlLogStreamProps {
	lines: StreamLineRecordOutput[];
}

export function GlLogStream(props: GlLogStreamProps): JSX.Element {
	return (
		<div class="gl-log-stream">
			<table class="gl-log-stream_table">
				<thead class="gl-log-stream_head">
					<tr class="gl-log-stream_row">
						<th class="gl-log-stream_cell type-header">process</th>
						<th class="gl-log-stream_cell type-header">stream</th>
						<th class="gl-log-stream_cell type-header">line</th>
					</tr>
				</thead>
				<tbody class="gl-log-stream_body">
					<For each={props.lines}>
						{(line) => (
							<tr class={`gl-log-stream_row stream-${line.stream}`}>
								<td class="gl-log-stream_cell type-process">{line.process_id}</td>
								<td class="gl-log-stream_cell type-stream">{line.stream === 'stdout' ? 'OUT' : 'ERR'}</td>
								<td class="gl-log-stream_cell type-line">{line.line}</td>
							</tr>
						)}
					</For>
				</tbody>
			</table>
		</div>
	);
}
