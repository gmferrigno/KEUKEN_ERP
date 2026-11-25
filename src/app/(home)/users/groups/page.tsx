import Splitter, { Item as SplitterItem } from 'devextreme-react/splitter';
import SectionHeader from '../../components/section/sectionHeader';
import UsersList from '@repo/domain-ui/users/groups/usersList';
import GroupsClient from '@repo/domain-ui/users/groups/groupsClient';

export default function Groups() {
    return (
        <div className="flex flex-col w-full h-full gap-y-2 overflow-hidden">
            <SectionHeader title="Grupos" />

            <div className="flex-1 min-h-0">
                <Splitter orientation="horizontal" width="100%" height="100%" className="gap-2">
                    <SplitterItem
                        resizable={true}
                    >
                        <GroupsClient />
                    </SplitterItem>
                    <SplitterItem
                        collapsed={false}
                        maxSize={'100%'}
                    >
                        <UsersList />
                    </SplitterItem>
                </Splitter>
            </div>
        </div>
    );
}
