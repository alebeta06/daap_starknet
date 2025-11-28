#[starknet::interface]
trait ICounter<T> {
    fn get_counter(self: @T) -> u32;
}
#[starknet::contract] 
mod CounterContract {

    use super::ICounter;
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};

    #[storage]
    struct Storage {
        counter: u32,
    }

    #[constructor]
    fn constructor(ref self: ContractState, init_value: u32) {
        self.counter.write(init_value);
    }

    #[abi(embed_v0)]
    impl CounterImpl of ICounter<ContractState> {
        fn get_counter(self: @ContractState) -> u32 {
            self.counter.read()
        }
    }
}